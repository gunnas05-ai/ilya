import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { DriverFeedPost, DriverFeedComment, RoadReport } from './driver-feed.entity';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(DriverFeedPost)
    private feedRepo: Repository<DriverFeedPost>,
    @InjectRepository(DriverFeedComment)
    private commentRepo: Repository<DriverFeedComment>,
    @InjectRepository(RoadReport)
    private roadRepo: Repository<RoadReport>,
  ) {}

  // ── Feed Posts ─────────────────────────────────────────
  async createPost(data: { authorId: string; authorName: string; content: string; imageUrl?: string; latitude?: number; longitude?: number; locationName?: string }) {
    if (!data.content || data.content.length < 5) throw new BadRequestException('İçerik en az 5 karakter olmalı');
    return this.feedRepo.save(this.feedRepo.create(data));
  }

  async getFeed(page = 1, limit = 20) {
    const [posts, total] = await this.feedRepo.findAndCount({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { posts, total, page };
  }

  async markHelpful(postId: string, userId: string) {
    const post = await this.feedRepo.findOne({ where: { id: postId } });
    if (!post) throw new BadRequestException('Gönderi bulunamadı');
    if (!post.helpfulUserIds) post.helpfulUserIds = [];
    if (post.helpfulUserIds.includes(userId)) throw new BadRequestException('Zaten faydalı işaretlediniz');
    post.helpfulUserIds.push(userId);
    post.helpfulCount = post.helpfulUserIds.length;
    return this.feedRepo.save(post);
  }

  // ── Comments ───────────────────────────────────────────
  async addComment(data: { postId: string; authorId: string; authorName: string; content: string }) {
    const post = await this.feedRepo.findOne({ where: { id: data.postId } });
    if (!post) throw new BadRequestException('Gönderi bulunamadı');
    const comment = await this.commentRepo.save(this.commentRepo.create(data));
    post.commentCount++;
    await this.feedRepo.save(post);
    return comment;
  }

  async getComments(postId: string) {
    return this.commentRepo.find({ where: { postId, isDeleted: false }, order: { createdAt: 'ASC' } });
  }

  // ── Road Reports ───────────────────────────────────────
  async reportRoadCondition(data: { latitude: number; longitude: number; roadName: string; reportType: string; description: string }) {
    const validTypes = ['trafik', 'kaza', 'yol_calismasi', 'buzlanma', 'sel', 'polis_kontrol', 'diger'];
    if (!validTypes.includes(data.reportType)) throw new BadRequestException('Geçersiz rapor türü');

    const report = this.roadRepo.create({
      ...data,
      reporterId: 'anonymous',
      validUntil: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
    });
    return this.roadRepo.save(report);
  }

  async getNearbyReports(lat: number, lng: number, radiusKm = 50) {
    // Simple bounding box filter (Haversine done in-memory for simplicity)
    const reports = await this.roadRepo.find({
      where: { isExpired: false, validUntil: MoreThanOrEqual(new Date()) },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return reports.filter((r) => {
      const d = this.haversineKm(lat, lng, r.latitude, r.longitude);
      return d <= radiusKm;
    }).map((r) => ({
      ...r,
      distanceKm: Math.round(this.haversineKm(lat, lng, r.latitude, r.longitude) * 10) / 10,
    }));
  }

  async confirmReport(reportId: string) {
    const report = await this.roadRepo.findOne({ where: { id: reportId } });
    if (!report) throw new BadRequestException('Rapor bulunamadı');
    report.confirmCount++;
    return this.roadRepo.save(report);
  }

  @Cron('*/5 * * * *') // Every 5 minutes
  async expireOldReports() {
    await this.roadRepo.update(
      { validUntil: MoreThanOrEqual(new Date(0)) as any, isExpired: false },
      { isExpired: true },
    );
    // Actually, use a proper query
    const expired = await this.roadRepo
      .createQueryBuilder('r')
      .where('r.validUntil < :now', { now: new Date() })
      .andWhere('r.isExpired = false')
      .getMany();
    for (const r of expired) {
      r.isExpired = true;
      await this.roadRepo.save(r);
    }
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
