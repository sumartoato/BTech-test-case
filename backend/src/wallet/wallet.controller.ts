import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransferDto } from './dto/transfer.dto';
import { WalletService } from './wallet.service';

@ApiTags('wallet and transfer')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized' })
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current user wallet and balance' })
  @ApiResponse({ status: 200, description: 'Wallet details' })
  getWallet(@CurrentUser() user: AuthUser) {
    return this.walletService.getWallet(user.id);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer balance to another user' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional key (max 100 chars) to make retries safe',
  })
  @ApiResponse({ status: 201, description: 'Transfer completed' })
  @ApiResponse({
    status: 400,
    description: 'Validation error, insufficient balance, or transfer to yourself',
  })
  @ApiResponse({ status: 404, description: 'Recipient not found' })
  transfer(
    @CurrentUser() user: AuthUser,
    @Body() dto: TransferDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.walletService.transfer(
      user.id,
      dto,
      idempotencyKey?.slice(0, 100) || randomUUID(),
    );
  }
}
