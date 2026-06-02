import { Controller, Get, Post, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { AuditService } from './audit.service';

@ApiTags('admin')
@Controller({ path: 'admin/database', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@ApiBearerAuth()
export class AdminDatabaseController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  @Get('tables')
  @ApiOperation({ summary: 'Veritabani tablolarini listele' })
  async listTables() {
    const isPostgres = this.dataSource.options.type === 'postgres';
    const query = isPostgres 
      ? "SELECT table_name FROM information_schema.tables WHERE table_schema='public'" 
      : "SELECT name as table_name FROM sqlite_master WHERE type='table'";
    
    const results = await this.dataSource.query(query);
    return { success: true, data: results.map((r: any) => r.table_name) };
  }

  @Get('table/:name')
  @ApiOperation({ summary: 'Tablo verilerini getir' })
  async getTableData(
    @Param('name') tableName: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    // Basic SQL injection protection: just check if table exists in list
    const tables = await this.listTables();
    if (!tables.data.includes(tableName)) {
      return { success: false, message: 'Gecersiz tablo adi' };
    }

    const data = await this.dataSource.query(`SELECT * FROM "${tableName}" LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`);
    return { success: true, data };
  }

  @Post('query')
  @ApiOperation({ summary: 'Raw SQL calistir (Dikkatli olun!)' })
  async runRawQuery(@Body('sql') sql: string, @Req() req: any) {
    if (!sql) return { success: false, message: 'SQL sorgusu gerekli' };

    try {
      const result = await this.dataSource.query(sql);
      
      // Audit log important actions
      const lowerSql = sql.toLowerCase();
      if (lowerSql.includes('delete') || lowerSql.includes('drop') || lowerSql.includes('update') || lowerSql.includes('alter')) {
        await this.auditService.logAdminAction({
          adminId: req.user.id,
          adminEmail: req.user.email,
          action: 'raw_sql_execution',
          description: `Kritik SQL calistirildi: ${sql.substring(0, 200)}`,
          ipAddress: req.ip,
        });
      }

      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
}
