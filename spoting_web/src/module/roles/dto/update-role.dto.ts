import { IsString, MaxLength } from 'class-validator';

export class UpdateRoleDto {
    @IsString()
    @MaxLength(255)
    roleName?: string;
}
