export class CreateOrderDto {
    user_id: number;
    amount: number;
    description: string;
    membership_type: number;
    end_date: Date;
} 