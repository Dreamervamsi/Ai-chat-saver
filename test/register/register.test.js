import { it, expect, test } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
app

it('to test the sum logic', async () => {
    const res = await request(app).get('/sum/10/20');

    expect(res.status).toBe(200);

});