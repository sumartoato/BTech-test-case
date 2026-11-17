import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup';

// needs a running postgres, see DATABASE_URL in .env
describe('Auth & wallet (e2e)', () => {
  let app: INestApplication;
  const suffix = Date.now();
  const alice = { email: `alice${suffix}@test.com`, password: 'password123' };
  const bob = { email: `bob${suffix}@test.com`, password: 'password123' };
  let aliceToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects register when passwords do not match', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...alice, confirmPassword: 'different1' })
      .expect(400);

    expect(res.body.message).toContain('confirmPassword must match password');
  });

  it('registers two users', async () => {
    for (const user of [alice, bob]) {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...user, confirmPassword: user.password })
        .expect(201);
    }
  });

  it('rejects duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...alice, confirmPassword: alice.password })
      .expect(409);
  });

  it('logs in and returns a jwt', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(alice)
      .expect(200);

    aliceToken = res.body.accessToken;
    const payload = JSON.parse(
      Buffer.from(aliceToken.split('.')[1], 'base64url').toString(),
    );
    expect(payload.email).toBe(alice.email);
    expect(payload.sub).toBeDefined();
  });

  it('protects /me', async () => {
    await request(app.getHttpServer()).get('/api/me').expect(401);

    const res = await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);

    expect(res.body.message).toBe(`Hello ${alice.email}, welcome back`);
  });

  it('transfers money once even when request is retried', async () => {
    const key = randomUUID();
    const send = () =>
      request(app.getHttpServer())
        .post('/api/wallet/transfer')
        .set('Authorization', `Bearer ${aliceToken}`)
        .set('Idempotency-Key', key)
        .send({ recipient: bob.email, amount: 25000, notes: 'dinner' });

    const [first, second] = await Promise.all([send(), send()]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);

    const wallet = await request(app.getHttpServer())
      .get('/api/wallet')
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);

    expect(wallet.body.balance).toBe(1000000 - 25000);
    expect(wallet.body.transfers).toHaveLength(1);
    expect(wallet.body.transfers[0]).toMatchObject({
      direction: 'out',
      counterparty: bob.email,
      amount: 25000,
      notes: 'dinner',
    });
  });

  it('rejects transfer above balance', async () => {
    await request(app.getHttpServer())
      .post('/api/wallet/transfer')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ recipient: bob.email, amount: 999999999 })
      .expect(400);
  });
});
