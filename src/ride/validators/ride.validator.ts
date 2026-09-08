import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransportRideTypeEntity } from '../../transport-ride-type/entities/transport-ride-type.entity.js';
import { RideEntity } from '../entities/ride.entity.js';

export class RideValidator {
  static validateTransportTypeExists(transportType: TransportRideTypeEntity | null) {
    if (!transportType) {
      throw new NotFoundException('Tipo de transporte não encontrado');
    }
  }

  static validateRideExists(ride: RideEntity | null): asserts ride is RideEntity {
    if (!ride) {
      throw new NotFoundException('Corrida não encontrada');
    }
  }
}