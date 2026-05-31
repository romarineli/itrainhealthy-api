import { Body, Controller, Get, Headers, Ip, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestWithUser } from '../auth/auth.types';
import { AcceptConsentDto } from './consents.dto';
import { ConsentsService } from './consents.service';

@Controller('api/consents')
@UseGuards(JwtAuthGuard)
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get()
  status(@Req() request: RequestWithUser) {
    return this.consentsService.status(request.user!.id);
  }

  @Get('status')
  getStatus(@Req() request: RequestWithUser) {
    return this.consentsService.status(request.user!.id);
  }

  @Post('accept')
  accept(
    @Req() request: RequestWithUser,
    @Body() dto: AcceptConsentDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.consentsService.accept(request.user!.id, dto, ipAddress, userAgent);
  }
}
