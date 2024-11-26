import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ZaloPayConfig } from '../config/zalopay.config';
import axios from 'axios';
import * as CryptoJS from 'crypto-js';
import * as moment from 'moment';
import * as qs from 'qs';

interface CreateZaloPayOrderParams {
  amount: number;
  orderId: string;
  transactionId: number;
  description: string;
  userId: number;
}

interface CreateClassTransactionDto {
  user_id: number;
  class_id: number;
  amount_paid: number;
  status_id: number;
  payment_method: string;
}

@Injectable()
export class PaymentClassService {
  constructor(private readonly prisma: DatabaseService) {}

  async createClassTransaction(data: CreateClassTransactionDto) {
    const transaction = await this.prisma.class_transaction.create({
      data: {
        ...data,
        order_id: `CLASS${Date.now()}${data.user_id}`
      }
    });

    // Tạo timeout để tự động chuyển sang failed sau 15 phút
    setTimeout(async () => {
      try {
        const currentTransaction = await this.prisma.class_transaction.findUnique({
          where: { class_transaction_id: transaction.class_transaction_id }
        });

        if (currentTransaction && currentTransaction.status_id === 2) {
          const status = await this.checkOrderStatus(currentTransaction.order_id);
          if (status.isPending) {
            await this.updateTransactionStatus(
              currentTransaction.class_transaction_id,
              3 // Failed
            );
          }
        }
      } catch (error) {
        console.error(`Error handling transaction timeout ${transaction.class_transaction_id}:`, error);
      }
    }, 15 * 60 * 1000);

    return transaction;
  }

  async createZaloPayOrder(params: CreateZaloPayOrderParams) {
    const { amount, orderId, transactionId, description, userId } = params;

    const embedData = {
      redirecturl: `${process.env.FRONTEND_URL}payment-class-status?orderId=${orderId}`,
      transaction_id: transactionId,
    };

    const order = {
      app_id: ZaloPayConfig.app_id,
      app_trans_id: `${moment().format('YYMMDD')}_${orderId}`,
      app_user: userId.toString(),
      app_time: Date.now(),
      item: JSON.stringify([]),
      embed_data: JSON.stringify(embedData),
      amount,
      callback_url: ZaloPayConfig.callback_url,
      description,
      bank_code: '',
    };

    const data = 
      ZaloPayConfig.app_id + '|' +
      order.app_trans_id + '|' +
      order.app_user + '|' +
      order.amount + '|' +
      order.app_time + '|' +
      order.embed_data + '|' +
      order.item;

    order['mac'] = CryptoJS.HmacSHA256(data, ZaloPayConfig.key1).toString();

    try {
      const result = await axios.post(ZaloPayConfig.endpoint, null, { 
        params: order 
      });
      return result.data;
    } catch (error) {
      console.error('ZaloPay create order error:', error);
      throw new Error('Cannot create ZaloPay order');
    }
  }

  async verifyCallback(callbackData: any): Promise<boolean> {
    const mac = CryptoJS.HmacSHA256(
      callbackData.data, 
      ZaloPayConfig.key2
    ).toString();
    return mac === callbackData.mac;
  }

  async updateTransactionStatus(transactionId: number, statusId: number) {
    return await this.prisma.class_transaction.update({
      where: { class_transaction_id: transactionId },
      data: { status_id: statusId }
    });
  }

  async checkOrderStatus(orderId: string) {
    const app_trans_id = `${moment().format('YYMMDD')}_${orderId}`;
    
    const postData = {
      app_id: ZaloPayConfig.app_id,
      app_trans_id: app_trans_id,
    };

    const data = postData.app_id + '|' + postData.app_trans_id + '|' + ZaloPayConfig.key1;
    postData['mac'] = CryptoJS.HmacSHA256(data, ZaloPayConfig.key1).toString();

    try {
      const result = await axios.post(
        'https://sb-openapi.zalopay.vn/v2/query',
        qs.stringify(postData),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const response = result.data;
      const returnCode = response.return_code;

      const transaction = await this.prisma.class_transaction.findFirst({
        where: { order_id: orderId }
      });
        
      if (transaction && transaction.status_id === 2) {
        let statusId;
        
        switch(returnCode) {
          case 1: // Thanh toán thành công
            statusId = 1;
            break;
          case 2: // Đang xử lý
          case 3: // Đang chờ thanh toán
            statusId = 2;
            break;
          default:
            statusId = 3;
        }
        
        if (statusId !== 2) {
          await this.updateTransactionStatus(
            transaction.class_transaction_id,
            statusId
          );
        }
      }
      
      return {
        code: returnCode,
        message: response.return_message,
        isSuccess: returnCode === 1,
        isCancelled: returnCode < 0,
        isPending: returnCode === 2 || returnCode === 3,
        transactionId: transaction?.class_transaction_id,
        statusId: transaction?.status_id
      };

    } catch (error) {
      console.error('Check order status error:', error);
      throw new Error('Cannot check order status');
    }
  }
} 