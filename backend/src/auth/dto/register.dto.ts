import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../common/match.decorator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  @Match('password', { message: 'confirmPassword must match password' })
  confirmPassword: string;
}
