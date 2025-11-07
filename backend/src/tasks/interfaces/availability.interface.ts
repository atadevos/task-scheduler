export interface IAvailabilityService {
  checkOverlap(
    userId: number,
    startDate: Date,
    endDate: Date,
    excludeTaskId: number | null,
  ): Promise<boolean>;
}
