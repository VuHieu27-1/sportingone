import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateImagesYardDto } from './dto/create-images-yard.dto';
import { UpdateImagesYardDto } from './dto/update-images-yard.dto';
import { UploadImagesYardDto } from './dto/upload-images-yard.dto';
import { ImagesYard } from './entities/images-yard.entity';
import { Yard } from '../yards/entities/yard.entity';
import { GoogleDriveService, type BufferedFile } from '../../common/google-drive/google-drive.service';

@Injectable()
export class ImagesYardService {
  constructor(
    @InjectRepository(ImagesYard)
    private readonly repository: Repository<ImagesYard>,
    @InjectRepository(Yard)
    private readonly yardRepository: Repository<Yard>,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  /**
   * Uploads an image file to Google Drive (folder: images-yard) and creates record
   */
  async uploadYardImageFile(
    file: BufferedFile,
    dto: UploadImagesYardDto,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp hình ảnh để tải lên');
    }

    const yardIdNum = Number(dto?.yardId);
    if (!yardIdNum || isNaN(yardIdNum)) {
      throw new BadRequestException('ID của sân (yardId) không hợp lệ');
    }

    const yard = await this.yardRepository.findOne({
      where: { id: yardIdNum },
    });
    if (!yard) {
      throw new NotFoundException(`Yard with ID ${yardIdNum} not found`);
    }

    const isCover = dto.isCover === true || dto.isCover === 'true';

    // Upload to Google Drive images-yard folder
    const uploadResult = await this.googleDriveService.uploadYardImage(
      file.buffer,
      file.originalname,
      file.mimetype,
      yardIdNum,
    );

    // If marked as cover, unmark previous covers for this yard
    if (isCover) {
      await this.repository.update({ yard: { id: yardIdNum } }, { isCover: false });
    }

    const entity = this.repository.create({
      imageUrl: uploadResult.directUrl,
      yard,
      isCover,
      caption: dto.caption ? dto.caption.trim() : null,
    });

    return this.repository.save(entity);
  }

  /**
   * Creates a new yard image record with URL.
   */
  async create(dto: CreateImagesYardDto) {
    const yard = await this.yardRepository.findOne({
      where: { id: dto.yardId },
    });
    if (!yard) {
      throw new NotFoundException(`Yard with ID ${dto.yardId} not found`);
    }

    // If marked as cover, unmark previous covers for this yard
    if (dto.isCover) {
      await this.repository.update({ yard: { id: dto.yardId } }, { isCover: false });
    }

    const entity = this.repository.create({
      imageUrl: dto.imageUrl.trim(),
      yard,
      isCover: dto.isCover || false,
      caption: dto.caption ? dto.caption.trim() : null,
    });

    return this.repository.save(entity);
  }

  /**
   * Retrieves all yard images in the system.
   */
  async findAll() {
    return this.repository.find({
      relations: { yard: true },
      order: { id: 'DESC' },
    });
  }

  /**
   * Retrieves all images for a specific sports yard.
   */
  async findByYard(yardId: number) {
    return this.repository.find({
      where: { yard: { id: yardId } },
      relations: { yard: true },
      order: { isCover: 'DESC', id: 'DESC' },
    });
  }

  /**
   * Retrieves single image record by ID.
   */
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { yard: true },
    });
    if (!entity) {
      throw new NotFoundException(`ImagesYard with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Updates an existing yard image.
   */
  async update(id: number, dto: UpdateImagesYardDto) {
    const entity = await this.findOne(id);
    const { yardId, ...cleanDto } = dto;

    if (yardId !== undefined) {
      const yard = await this.yardRepository.findOne({
        where: { id: yardId },
      });
      if (!yard) {
        throw new NotFoundException(`Yard with ID ${yardId} not found`);
      }
      entity.yard = yard;
    }

    if (dto.isCover) {
      const currentYardId = entity.yard?.id || yardId;
      if (currentYardId) {
        await this.repository.update({ yard: { id: currentYardId } }, { isCover: false });
      }
    }

    this.repository.merge(entity, cleanDto);
    return this.repository.save(entity);
  }

  /**
   * Deletes a yard image record and deletes file from Google Drive if exists.
   */
  async remove(id: number) {
    const entity = await this.findOne(id);

    // If hosted on Google Drive, clean up drive file
    const fileId = this.googleDriveService.extractFileIdFromUrl(entity.imageUrl);
    if (fileId) {
      await this.googleDriveService.deleteFile(fileId);
    }

    await this.repository.softDelete(id);
    return {
      success: true,
      message: `Đã xóa ảnh sân có ID #${id} thành công`,
    };
  }
}
