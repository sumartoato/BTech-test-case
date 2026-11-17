import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';

export class TransferDto {
  @ApiProperty({ example: 'recipient@example.com', description: 'Recipient email' })
  @IsEmail()
  recipient: string;

  @ApiProperty({ example: 50000, minimum: 1, maximum: 1_000_000_000 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(1_000_000_000)
  amount: number;

  @ApiPropertyOptional({ example: 'Lunch money', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
