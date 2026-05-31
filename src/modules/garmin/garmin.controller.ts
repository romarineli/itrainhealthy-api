import { Body, Controller, Delete, Get, Headers, Post, Query } from '@nestjs/common';
import { GarminDisconnectDto, GarminManualSyncDto } from './garmin.dto';
import { GarminService } from './garmin.service';

@Controller('api/garmin')
export class GarminController {
  constructor(private readonly garminService: GarminService) {}

  @Get('authorize/start')
  startAuthorization(@Headers('x-user-id') headerUserId?: string, @Query('userId') queryUserId?: string) {
    return this.garminService.startAuthorization(this.resolveUserId(headerUserId, queryUserId));
  }

  @Get('connect')
  getConnectUrl(@Headers('x-user-id') headerUserId?: string, @Query('userId') queryUserId?: string) {
    return this.garminService.startAuthorization(this.resolveUserId(headerUserId, queryUserId));
  }

  @Get('callback')
  handleCallback(@Query('code') code?: string, @Query('state') state?: string) {
    return this.garminService.handleCallback(code, state);
  }

  @Get('status')
  getStatus(@Headers('x-user-id') headerUserId?: string, @Query('userId') queryUserId?: string) {
    return this.garminService.getStatus(this.resolveUserId(headerUserId, queryUserId));
  }

  @Delete('disconnect')
  disconnect(
    @Body() dto: GarminDisconnectDto,
    @Headers('x-user-id') headerUserId?: string,
    @Query('userId') queryUserId?: string,
  ) {
    return this.garminService.disconnect(this.resolveUserId(headerUserId, queryUserId), dto?.revokeRemote ?? false);
  }

  @Post('disconnect')
  disconnectPost(
    @Body() dto: GarminDisconnectDto,
    @Headers('x-user-id') headerUserId?: string,
    @Query('userId') queryUserId?: string,
  ) {
    return this.garminService.disconnect(this.resolveUserId(headerUserId, queryUserId), dto?.revokeRemote ?? false);
  }

  @Post('sync')
  sync(@Body() dto: GarminManualSyncDto, @Headers('x-user-id') headerUserId?: string, @Query('userId') queryUserId?: string) {
    return this.garminService.sync(this.resolveUserId(headerUserId, queryUserId), dto ?? {});
  }

  private resolveUserId(headerUserId?: string, queryUserId?: string): string {
    // TODO(auth): replace this temporary MVP user selector with authenticated subject from auth middleware/JWT.
    return headerUserId || queryUserId || '';
  }
}
