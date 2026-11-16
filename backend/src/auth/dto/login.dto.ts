import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'sumarto@test.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'jakarta@909' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
