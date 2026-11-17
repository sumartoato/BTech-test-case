import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';

export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.enableCors();
  app.use(compression());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
