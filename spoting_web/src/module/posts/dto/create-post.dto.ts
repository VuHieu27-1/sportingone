import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreatePostDto {
  @IsNumber() @IsNotEmpty()
  userId: number;

  @IsString() @IsNotEmpty()
  postname: string;

  @IsString() @IsNotEmpty()
  content: string;
}
