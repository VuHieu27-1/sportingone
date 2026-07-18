
# Tài liệu Giải thích Kiến trúc & Mã nguồn NestJS Services

Tài liệu này giải thích chi tiết cấu trúc, logic lập trình và các mẫu thiết kế (Design Patterns) được sử dụng trong các NestJS Services được tạo mới/cập nhật trong dự án **sporting_web**.

---

## 1. Tổng quan Kiến trúc Service

Toàn bộ các Service trong dự án đều tuân thủ các nguyên tắc thiết kế sạch (Clean Architecture), đảm bảo:
*   **Loose Coupling (Liên kết lỏng)**: Giao tiếp với Database thông qua Repository Pattern của TypeORM.
*   **High Cohesion (Tính kết dính cao)**: Mỗi service chỉ chịu trách nhiệm quản lý logic nghiệp vụ của chính thực thể đó.
*   **Type Safety (An toàn kiểu dữ liệu)**: Khai báo đầy đủ kiểu dữ liệu TS cho các tham số DTO và thực thể trả về.
*   **Trải nghiệm người dùng tốt (Validation & Error Handling)**: Kiểm tra tính hợp lệ dữ liệu và ném lỗi rõ ràng bằng HTTP Exception tiêu chuẩn.

---

## 2. Các Mẫu Thiết kế Chủ đạo (Core Patterns)

### 2.1. Đăng ký & Inject Repository liên kết
Để thực hiện CRUD và validate khóa ngoại chính xác, Service cần truy cập vào bảng hiện tại và các bảng liên quan. 
Ví dụ trong `YardsService`:
```typescript
constructor(
  @InjectRepository(Yard) private readonly repository: Repository<Yard>,
  @InjectRepository(SportType) private readonly sportTypeRepository: Repository<SportType>,
  @InjectRepository(Vendor) private readonly vendorRepository: Repository<Vendor>,
  @InjectRepository(Sale) private readonly saleRepository: Repository<Sale>,
  @InjectRepository(Types) private readonly typeYardRepository: Repository<Types>,
) {}
```
TypeORM sẽ tự động inject các lớp Repository quản lý các bảng tương ứng vào Service thông qua cơ chế Dependency Injection của NestJS.

---

### 2.2. Kiểm tra Ràng buộc Khóa ngoại (Foreign Key Validation)
Khi tạo mới (`create`) hoặc cập nhật (`update`) thực thể chứa khóa ngoại, hệ thống sẽ **truy vấn kiểm tra xem thực thể liên quan có tồn tại thực sự hay không** trước khi thực hiện ghi đè dữ liệu.
*   **Tại sao cần làm vậy?** Nếu không validate, hệ thống sẽ gửi câu lệnh SQL trực tiếp xuống database, gây ra lỗi Crash ràng buộc khóa ngoại (Foreign Key Constraint Fail) từ MySQL, trả về mã lỗi 500 không thân thiện cho Client.
*   **Giải pháp thực hiện**:
```typescript
// Ví dụ kiểm tra xem Vendor có tồn tại không trước khi gán cho Yard
const vendorVal = await this.vendorRepository.findOne({ where: { id: dto.vendorId } });
if (!vendorVal) {
  throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
}
entity.vendor = vendorVal;
```

---

### 2.3. Bóc tách DTO để tránh lỗi gán kiểu TypeScript (Destructuring DTO)
Do trong thực thể TypeORM các mối quan hệ được định nghĩa là một Object thực thể (ví dụ: `yard.vendor` kiểu `Vendor`), trong khi DTO gửi lên từ Client chỉ chứa ID dạng số (ví dụ: `dto.vendorId` kiểu `number`). 
Nếu gọi lệnh `this.repository.merge(entity, dto)`, TypeScript sẽ báo lỗi biên dịch do lệch kiểu dữ liệu (`number` không thể gán cho `Vendor`).

**Giải pháp:** Bóc tách các ID liên kết ra khỏi DTO trước khi thực hiện `merge` hoặc `create`:
```typescript
// Bóc tách các ID quan hệ ra, chỉ giữ lại cleanDto chứa thuộc tính nguyên bản của Yard
const { sportTypeId, vendorId, saleId, typeYardId, ...cleanDto } = dto;
this.repository.merge(entity, cleanDto as any);
```
Sau đó, gán thực thể liên kết sau khi đã validate thành công.

---

### 2.4. Tự động tải dữ liệu liên quan (Relations Eager Loading)
Trong phương thức `findAll()` và `findOne()`, hệ thống sử dụng cú pháp TypeORM v0.3 để nạp kèm các thông tin liên quan, tránh lỗi N+1 query và cung cấp đầy đủ thông tin cho client.
```typescript
async findAll() {
  return this.repository.find({
    relations: {
      sportType: true,
      vendor: true,
      sale: true,
      typeYard: true
    }
  });
}
```

---

## 3. Phân tích Chi tiết Lớp Service Tiêu biểu

### 3.1. Dịch vụ Đặt sân tiêu biểu: `YardsService`
File này chịu trách nhiệm quản lý thông tin các sân bóng, xử lý mối liên kết phức tạp với 4 thực thể khác:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateYardDto } from './dto/create-yard.dto';
import { UpdateYardDto } from './dto/update-yard.dto';
import { Yard } from './entities/yard.entity';
// Import các thực thể liên quan
import { SportType } from '../sport-types/entities/sport-type.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Types } from '../types/entities/type.entity';

@Injectable()
export class YardsService {
  constructor(
    @InjectRepository(Yard) private readonly repository: Repository<Yard>,
    @InjectRepository(SportType) private readonly sportTypeRepository: Repository<SportType>,
    @InjectRepository(Vendor) private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Sale) private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Types) private readonly typeYardRepository: Repository<Types>,
  ) {}

  // 1. Tạo mới Yard kèm kiểm tra quan hệ
  async create(dto: CreateYardDto) {
    // Tách các ID quan hệ để tránh gán sai kiểu dữ liệu
    const { sportTypeId, vendorId, saleId, typeYardId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Yard>);

    // Kiểm tra & Gán SportType (nullable)
    if (dto.sportTypeId !== undefined && dto.sportTypeId !== null) {
      const sportTypeVal = await this.sportTypeRepository.findOne({ where: { id: dto.sportTypeId } });
      if (!sportTypeVal) throw new NotFoundException(`SportType with ID ${dto.sportTypeId} not found`);
      entity.sportType = sportTypeVal;
    }
    
    // Kiểm tra & Gán Vendor
    if (dto.vendorId !== undefined && dto.vendorId !== null) {
      const vendorVal = await this.vendorRepository.findOne({ where: { id: dto.vendorId } });
      if (!vendorVal) throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
      entity.vendor = vendorVal;
    }

    // Kiểm tra & Gán Sale
    if (dto.saleId !== undefined && dto.saleId !== null) {
      const saleVal = await this.saleRepository.findOne({ where: { id: dto.saleId } });
      if (!saleVal) throw new NotFoundException(`Sale with ID ${dto.saleId} not found`);
      entity.sale = saleVal;
    }

    // Kiểm tra & Gán Loại Sân (Types)
    if (dto.typeYardId !== undefined && dto.typeYardId !== null) {
      const typeYardVal = await this.typeYardRepository.findOne({ where: { id: dto.typeYardId } });
      if (!typeYardVal) throw new NotFoundException(`Types with ID ${dto.typeYardId} not found`);
      entity.typeYard = typeYardVal;
    }

    return this.repository.save(entity);
  }

  // 2. Tìm kiếm tất cả sân bóng kèm thông tin đầy đủ
  async findAll() {
    return this.repository.find({
      relations: { sportType: true, vendor: true, sale: true, typeYard: true }
    });
  }

  // 3. Tìm một sân bóng theo ID
  async findOne(id: number) {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { sportType: true, vendor: true, sale: true, typeYard: true }
    });
    if (!entity) {
      throw new NotFoundException(`Yard with ID ${id} not found`);
    }
    return entity;
  }

  // 4. Cập nhật thông tin sân bóng
  async update(id: number, dto: UpdateYardDto) {
    const entity = await this.findOne(id);
    
    const { sportTypeId, vendorId, saleId, typeYardId, ...cleanDto } = dto;
    this.repository.merge(entity, cleanDto as any);

    // Cập nhật động các quan hệ (nếu truyền lên là null thì xóa liên kết)
    if (dto.sportTypeId !== undefined) {
      if (dto.sportTypeId === null) {
        entity.sportType = null as any; // Cast as any để TS cho phép gán null giải phóng quan hệ
      } else {
        const sportTypeVal = await this.sportTypeRepository.findOne({ where: { id: dto.sportTypeId } });
        if (!sportTypeVal) throw new NotFoundException(`SportType with ID ${dto.sportTypeId} not found`);
        entity.sportType = sportTypeVal;
      }
    }
    
    // Tương tự xử lý cho các trường khác ...

    return this.repository.save(entity);
  }

  // 5. Xóa sân bóng
  async remove(id: number) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return "Delete success";
  }
}
```

---

### 3.2. Dịch vụ Đệ quy tự liên kết: `CommentsService`
Quản lý luồng bình luận trên diễn đàn, cho phép bình luận này trả lời (reply) bình luận kia tạo thành cây bình luận:

```typescript
@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment) private readonly repository: Repository<Comment>,
    @InjectRepository(Post) private readonly postRepository: Repository<Post>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    // Lưu ý: Không cần inject thêm parentCommentRepository vì nó chính là repository của Comment!
  ) {}

  async create(dto: CreateCommentDto) {
    const { postId, userId, parentCommentId, ...cleanDto } = dto;
    const entity = this.repository.create(cleanDto as DeepPartial<Comment>);

    // Validate Post liên kết
    const postVal = await this.postRepository.findOne({ where: { id: dto.postId } });
    if (!postVal) throw new NotFoundException(`Post with ID ${dto.postId} not found`);
    entity.post = postVal;

    // Validate User bình luận
    const userVal = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!userVal) throw new NotFoundException(`User with ID ${dto.userId} not found`);
    entity.user = userVal;

    // Validate Bình luận cha (nếu là câu trả lời)
    if (dto.parentCommentId !== undefined && dto.parentCommentId !== null) {
      const parentCommentVal = await this.repository.findOne({ where: { id: dto.parentCommentId } });
      if (!parentCommentVal) throw new NotFoundException(`Comment with ID ${dto.parentCommentId} not found`);
      entity.parentComment = parentCommentVal;
    }

    return this.repository.save(entity);
  }

  async findAll() {
    return this.repository.find({
      relations: {
        post: true,
        user: true,
        parentComment: true,
        replies: true // Tự động load các câu trả lời trực tiếp của comment này
      }
    });
  }
}
```

---

## 4. Tổng kết các API Endpoints tiêu chuẩn được sinh ra

| Phương thức HTTP | Route API | Nghiệp vụ | Mã trạng thái trả về khi thành công |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/<entity-name>` | Tạo mới bản ghi (Validate dữ liệu & khóa ngoại) | `201 Created` |
| **GET** | `/api/v1/<entity-name>` | Lấy danh sách (Nạp kèm các dữ liệu quan hệ) | `200 OK` |
| **GET** | `/api/v1/<entity-name>/:id` | Xem chi tiết 1 bản ghi theo ID (Ném lỗi 404 nếu thiếu) | `200 OK` |
| **PATCH** | `/api/v1/<entity-name>/:id` | Cập nhật bản ghi (Partial update) | `200 OK` |
| **DELETE** | `/api/v1/<entity-name>/:id` | Xóa bản ghi (Trả về thông báo "Delete success") | `200 OK` |
