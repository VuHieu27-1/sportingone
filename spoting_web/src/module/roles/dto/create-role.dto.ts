import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    roleName: string;
}
