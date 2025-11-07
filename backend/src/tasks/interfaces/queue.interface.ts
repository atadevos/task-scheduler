export interface IQueueService {
  add(queueName: string, jobData: any): Promise<void>;
}

export interface IAvailabilityQueue extends IQueueService {
  // Specific methods for availability queue if needed
}
