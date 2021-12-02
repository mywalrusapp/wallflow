/* eslint-disable @typescript-eslint/ban-types */
import knex, { Knex } from 'knex';
import { DeclarePlugin } from '../lib/PluginBase';

/* eslint-disable @typescript-eslint/no-empty-interface */
interface KnexClient<T extends {} = any, R = unknown[]> extends Knex<T, R> {}
class KnexClient<T extends {} = any, R = unknown[]> {
  constructor(config: Knex.Config) {
    return knex<T, R>(config);
  }
}

class KnexMysql<T extends {} = any, R = unknown[]> extends KnexClient<T, R> {
  constructor() {
    super({
      client: 'mysql',
      connection: {
        host: process.env.MYSQL_DB_HOST,
        port: process.env.MYSQL_DB_PORT ? parseInt(process.env.MYSQL_DB_PORT, 10) : 3306,
        user: process.env.MYSQL_DB_USER,
        password: process.env.MYSQL_DB_PASSWORD,
        database: process.env.MYSQL_DB_DATABASE,
      },
    });
  }
}

export default DeclarePlugin<KnexMysql>(new KnexMysql());
