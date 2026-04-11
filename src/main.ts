import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

type DeployMode = 'onprem' | 'saas' | 'dev';

function applyDeployMode() {
  const mode = (process.env.DEPLOY_MODE ?? 'dev') as DeployMode;

  const defaults: Record<DeployMode, Record<string, string>> = {
    onprem: {
      REQUIRE_EMAIL_VERIFICATION: 'false',
      REGISTRATION_DISABLED: 'true',
      FORGOT_PASSWORD_ENABLED: 'false',
    },
    saas: {
      REQUIRE_EMAIL_VERIFICATION: 'true',
      REGISTRATION_DISABLED: 'false',
      FORGOT_PASSWORD_ENABLED: 'true',
    },
    dev: {},
  };

  const modeDefaults = defaults[mode] ?? {};
  for (const [key, value] of Object.entries(modeDefaults)) {
    // DEPLOY_MODE 優先；但若 .env 已明確設定，允許工程師在 dev 環境覆蓋
    if (mode !== 'dev') {
      process.env[key] = value;
    } else {
      process.env[key] ??= value;
    }
  }

  console.log(`[LocalAuth] DEPLOY_MODE=${mode}`);
}

async function seedDefaultAdmin(app: INestApplication) {
  const prisma = app.get(PrismaService);
  const count = await prisma.user.count();
  if (count > 0) return;

  const email = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@local.dev';
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? 'Admin1234!';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Admin',
      isActive: true,
      emailVerified: true,
      passwordChangedAt: new Date(),
    },
  });

  console.log('');
  console.log('========================================');
  console.log('  Default admin account created');
  console.log(`  Email   : ${email}`);
  console.log(`  Password: ${password}`);
  console.log('  Please change the password after first login.');
  console.log('========================================');
  console.log('');
}

async function bootstrap() {
  applyDeployMode();

  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors();
  
  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await seedDefaultAdmin(app);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`Admin UI: http://localhost:${process.env.PORT ?? 3000}/admin`);
}
bootstrap();
