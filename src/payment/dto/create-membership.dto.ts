export class CreateMembershipDto {
    user_id: number;
    membership_type: number;
    price: number;
    start_date: Date;
    end_date: Date;
    status_id: number;
    payment_method: string;
    quantity?: number;
} 