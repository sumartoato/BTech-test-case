import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';

/**
 * SWAGGER_ENABLED=true/false overrides; otherwise enabled unless NODE_ENV=production.
 */
export function isSwaggerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.SWAGGER_ENABLED?.trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return env.NODE_ENV !== 'production';
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Wallet API')
    .setDescription('Auth, wallet balance, and transfer endpoints')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  Logger.log(`Swagger docs available at /${SWAGGER_PATH}`, 'Swagger');
}
