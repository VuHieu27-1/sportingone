import { Test, TestingModule } from '@nestjs/testing';
import { VendorsService } from './vendors.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Vendor } from './entities/vendor.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('VendorsService', () => {
  let service: VendorsService;
  let vendorRepo: any;
  let userRepo: any;
  let roleRepo: any;

  beforeEach(async () => {
    vendorRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      find: jest.fn(),
      findOne: jest.fn(),
      merge: jest.fn((entity, dto) => Object.assign(entity, dto)),
      remove: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
      save: jest.fn((user) => Promise.resolve(user)),
    };

    roleRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ id: 2, ...dto })),
      save: jest.fn((role) => Promise.resolve(role)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        {
          provide: getRepositoryToken(Vendor),
          useValue: vendorRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: roleRepo,
        },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create vendor request', () => {
    it('should throw ForbiddenException if userId in dto does not match token currentUserId', async () => {
      await expect(
        service.create({ userId: 2, vendorName: 'Sports Hub' }, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow user to create multiple vendor requests for different venues', async () => {
      const mockUser = { id: 1, username: 'testuser' };
      userRepo.findOne.mockResolvedValue(mockUser);

      const request1 = await service.create(
        { userId: 1, vendorName: 'Sports Hub 1', vendorAddress: 'Address 1' },
        1,
      );

      const request2 = await service.create(
        { userId: 1, vendorName: 'Sports Hub 2', vendorAddress: 'Address 2' },
        1,
      );

      expect(vendorRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorName: 'Sports Hub 1',
          status: 'pending',
        }),
      );
      expect(vendorRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorName: 'Sports Hub 2',
          status: 'pending',
        }),
      );
      expect(request1).toBeDefined();
      expect(request2).toBeDefined();
    });
  });

  describe('update vendor status (approval)', () => {
    it('should update status to active and assign vendor role to user when approved', async () => {
      const mockUser = { id: 1, username: 'testuser', role: null };
      const mockVendor = {
        id: 5,
        vendorName: 'Sports Hub',
        status: 'pending',
        user: mockUser,
      };

      vendorRepo.findOne.mockResolvedValue(mockVendor);
      roleRepo.findOne.mockResolvedValue({ id: 2, roleName: 'vendor' });

      await service.update(5, { status: 'active' });

      expect(roleRepo.findOne).toHaveBeenCalledWith({
        where: { roleName: 'vendor' },
      });
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          role: expect.objectContaining({ roleName: 'vendor' }),
        }),
      );
      expect(vendorRepo.save).toHaveBeenCalled();
    });
  });
});
