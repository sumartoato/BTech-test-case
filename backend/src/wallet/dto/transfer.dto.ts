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
  @IsEmail()
  recipient: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(1_000_000_000)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
