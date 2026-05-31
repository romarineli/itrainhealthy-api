import { Body, Controller, Delete, Get, Headers, Logger, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GarminDisconnectDto, GarminManualSyncDto } from './garmin.dto';
import { GarminService } from './garmin.service';

interface RedirectResponse {
  redirect(status: number, url: string): void;
}

@Controller('api/garmin')
export class GarminController {
  private readonly logger = new Logger(GarminController.name);

  constructor(
    private readonly garminService: GarminService,
    private readonly config: ConfigService,
  ) {}

  @Get('authorize/start')
  startAuthorization(@Headers('x-user-id') headerUserId?: string, @Query('userId') queryUserId?: string) {
    return this.garminService.startAuthorization(this.resolveUserId(headerUserId, queryUserId));
  }

  @Get('connect')
  getConnectUrl(@Headers('x-user-id') headerUserId?: string, @Query('userId') queryUserId?: string) {
    return this.garminService.startAuthorization(this.resolveUserId(headerUserId, queryUserId));
  }

  @Get('callback')
  async handleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('format') format: string | undefined,
    @Headers('accept') accept: string | undefined,
    @Res({ passthrough: true }) response: RedirectResponse,
  ) {
    const wantsJson = format === 'json' || accept?.includes('application/json');

    if (wantsJson) {
      return this.garminService.handleCallback(code, state);
    }

    try {
      await this.garminService.handleCallback(code, state);
      response.redirect(302, this.buildCallbackRedirectUrl('success'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Garmin callback error';
      this.logger.warn(`Garmin callback failed: ${message}`);
      response.redirect(302, this.buildCallbackRedirectUrl('error', this.toSafeCallbackMessage(error)));
    }
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

  private buildCallbackRedirectUrl(result: 'success' | 'error', message?: string): string {
    const configuredUrl =
      result === 'success'
        ? this.config.get<string>('GARMIN_SUCCESS_REDIRECT_URL')
        : this.config.get<string>('GARMIN_ERROR_REDIRECT_URL');
    const redirectUrl = new URL(configuredUrl || this.defaultFrontendRedirectUrl(result));
    redirectUrl.searchParams.set('provider', 'garmin');
    redirectUrl.searchParams.set('status', result === 'success' ? 'connected' : 'error');
    if (message) {
      redirectUrl.searchParams.set('message', message);
    }
    return redirectUrl.toString();
  }

  private defaultFrontendRedirectUrl(result: 'success' | 'error'): string {
    const frontendUrl = this.resolveFrontendUrl();
    return `${frontendUrl.replace(/\/$/, '')}/integrations/garmin/${result}`;
  }

  private resolveFrontendUrl(): string {
    const corsOrigin = this.config.get<string>('CORS_ORIGIN')?.split(',')[0]?.trim();
    return this.config.get<string>('FRONTEND_URL') || this.config.get<string>('APP_URL') || corsOrigin || 'http://localhost:5173';
  }

  private toSafeCallbackMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('requires code and state') || message.includes('Invalid Garmin state') || message.includes('Expired Garmin state')) {
      return 'invalid_callback';
    }
    if (message.includes('not configured')) {
      return 'not_configured';
    }
    return 'connection_failed';
  }

  private resolveUserId(headerUserId?: string, queryUserId?: string): string {
    // TODO(auth): replace this temporary MVP user selector with authenticated subject from auth middleware/JWT.
    return headerUserId || queryUserId || '';
  }
}
