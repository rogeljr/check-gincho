import { MercadoPagoConfig } from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

const mercadoPagoConfig = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  options: {
    timeout: 10000
  }
});

export default mercadoPagoConfig;
