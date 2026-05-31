import { ConsentType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class AcceptConsentDto {
  @IsEnum(ConsentType)
  type: ConsentType = ConsentType.TERMS_OF_USE;

  @IsString()
  version = '2026-05-31';

  @IsOptional()
  @IsBoolean()
  accepted?: boolean = true;
}
