import { BookingDomain, ProviderType } from '@prisma/client';

const MAP: Record<ProviderType, BookingDomain> = {
  HOTEL: BookingDomain.HOTEL,
  TOUR: BookingDomain.TOUR,
  ACTIVITY: BookingDomain.EXPERIENCE,
  TRANSPORT: BookingDomain.TRANSPORT,
  FLIGHT: BookingDomain.FLIGHT,
};

/** 1 Provider chi thuoc dung 1 ProviderType nen chi ban duoc dung 1 BookingDomain — dung de gan
 * cung applicableDomains cho Promotion Provider tu tao (V7 vong 11), khong nhan tu client. */
export function providerTypeToBookingDomain(
  providerType: ProviderType,
): BookingDomain {
  return MAP[providerType];
}
