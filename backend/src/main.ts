import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './setup';
import { isSwaggerEnabled, setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  if (isSwaggerEnabled()) {
    setupSwagger(app);
  }
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
