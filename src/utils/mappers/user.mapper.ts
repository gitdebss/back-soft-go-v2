import { UserEntity } from "../../user/entities/user.entity.js";

export interface ResponseUserDto {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

export class UserMapper {
  static toResponse(user: UserEntity): ResponseUserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
    };
  }
}
