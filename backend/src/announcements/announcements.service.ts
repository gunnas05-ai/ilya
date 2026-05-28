import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './announcement.entity';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepo: Repository<Announcement>,
  ) {}

  async getLatest(): Promise<Announcement | null> {
    const list = await this.announcementRepo.find({
      order: { updatedAt: 'DESC' },
      take: 1,
    });
    return list.length > 0 ? list[0] : null;
  }

  async createOrUpdate(content: string): Promise<Announcement> {
    const latest = await this.getLatest();
    if (latest) {
      latest.content = content;
      return this.announcementRepo.save(latest);
    } else {
      const newAnn = this.announcementRepo.create({ content });
      return this.announcementRepo.save(newAnn);
    }
  }
}
