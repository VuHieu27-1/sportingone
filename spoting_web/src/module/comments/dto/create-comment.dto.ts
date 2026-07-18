import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsNumber() @IsNotEmpty()
  postId: number;

  @IsString() @IsNotEmpty()
  comment: string;

  @IsNumber() @IsNotEmpty()
  userId: number;

  @IsNumber() @IsOptional()
  parentCommentId?: number | null;
}
