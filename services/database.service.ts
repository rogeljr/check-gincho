import * as SQLite from 'expo-sqlite';

const DB_NAME = 'checkguincho.db';

export interface SinistroLocal {
  id?: number;
  numero_sinistro: string;
  nome_cliente: string;
  cpf_cliente?: string;
  telefone_cliente?: string;
  placa_veiculo: string;
  tipo_atendimento: string;  // ✅ ADICIONADO
  modelo_veiculo?: string;
  cor_veiculo?: string;
  origem_latitude?: number;
  origem_longitude?: number;
  origem_endereco?: string;
  destino_latitude?: number;
  destino_longitude?: number;
  destino_endereco?: string;
  quilometragem?: number;
  observacoes?: string;
  pdf_local_url?: string;
  assinatura_base64?: string;  // ✅ ADICIONADO
  assinatura_timestamp?: string;
  status: 'rascunho' | 'em_andamento' | 'finalizado';
  sincronizado: boolean;
  servidor_id?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FotoLocal {
  id?: number;
  sinistro_local_id: number;
  uri: string;
  base64?: string;
  tipo: string;
  descricao?: string;
  ordem?: number;  // ✅ ADICIONADO
  sincronizado: boolean;
  servidor_id?: number;
  createdAt: string;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async initDatabase(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (!this.db) {
          this.db = await SQLite.openDatabaseAsync(DB_NAME);
          await this.createTables();
          console.log('✅ Database inicializado com sucesso');
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar database:', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initDatabase();
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database não inicializado');

    try {
      // Tabela de Sinistros
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sinistros (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero_sinistro TEXT NOT NULL,
          nome_cliente TEXT NOT NULL,
          cpf_cliente TEXT,
          telefone_cliente TEXT,
          placa_veiculo TEXT NOT NULL,
          tipo_atendimento TEXT DEFAULT 'Guincho',
          modelo_veiculo TEXT,
          cor_veiculo TEXT,
          origem_latitude REAL,
          origem_longitude REAL,
          origem_endereco TEXT,
          destino_latitude REAL,
          destino_longitude REAL,
          destino_endereco TEXT,
          quilometragem REAL,
          observacoes TEXT,
          pdf_local_url TEXT,
          assinatura_timestamp TEXT,
          status TEXT DEFAULT 'rascunho',
          sincronizado INTEGER DEFAULT 0,
          servidor_id INTEGER,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `);

      // Tabela de Fotos
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS fotos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sinistro_local_id INTEGER NOT NULL,
          uri TEXT NOT NULL,
          base64 TEXT,
          tipo TEXT NOT NULL,
          descricao TEXT,
          sincronizado INTEGER DEFAULT 0,
          servidor_id INTEGER,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (sinistro_local_id) REFERENCES sinistros(id) ON DELETE CASCADE
        );
      `);

      // Índices para performance
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sinistros_sincronizado ON sinistros(sincronizado);
        CREATE INDEX IF NOT EXISTS idx_sinistros_servidor_id ON sinistros(servidor_id);
        CREATE INDEX IF NOT EXISTS idx_fotos_sincronizado ON fotos(sincronizado);
        CREATE INDEX IF NOT EXISTS idx_fotos_sinistro ON fotos(sinistro_local_id);
      `);

      // Aplicar migrações de colunas faltantes
      await this.ensureColumnExists('sinistros', 'tipo_atendimento', "TEXT DEFAULT 'Guincho'");
      await this.ensureColumnExists('sinistros', 'pdf_local_url', 'TEXT');
      await this.ensureColumnExists('sinistros', 'assinatura_timestamp', 'TEXT');
      await this.ensureColumnExists('sinistros', 'assinatura_base64', 'TEXT');
      
      console.log('✅ Tabelas criadas e migradas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao criar/migrar tabelas:', error);
      throw error;
    }
  }

  private async ensureColumnExists(
    tableName: string,
    columnName: string,
    columnType: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database não inicializado');

    const columns = await this.db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(${tableName});`
    );

    const exists = columns.some(col => col.name === columnName);

    if (!exists) {
      await this.db.execAsync(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};`
      );
    }
  }

  // ==================== SINISTROS ====================

  async criarSinistro(sinistro: Omit<SinistroLocal, 'id'>): Promise<number> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');

    const result = await this.db.runAsync(
      `INSERT INTO sinistros (
        numero_sinistro, nome_cliente, cpf_cliente, telefone_cliente,
        placa_veiculo, modelo_veiculo, cor_veiculo,
        origem_latitude, origem_longitude, origem_endereco,
        destino_latitude, destino_longitude, destino_endereco,
        quilometragem, observacoes, assinatura_base64, assinatura_timestamp, status, sincronizado, servidor_id,
        pdf_local_url, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sinistro.numero_sinistro,
        sinistro.nome_cliente,
        sinistro.cpf_cliente || null,
        sinistro.telefone_cliente || null,
        sinistro.placa_veiculo,
        sinistro.modelo_veiculo || null,
        sinistro.cor_veiculo || null,
        sinistro.origem_latitude || null,
        sinistro.origem_longitude || null,
        sinistro.origem_endereco || null,
        sinistro.destino_latitude || null,
        sinistro.destino_longitude || null,
        sinistro.destino_endereco || null,
        sinistro.quilometragem || null,
        sinistro.observacoes || null,
        sinistro.assinatura_base64 || null,
        sinistro.assinatura_timestamp || null,
        sinistro.status,
        sinistro.sincronizado ? 1 : 0,
        sinistro.servidor_id || null,
        sinistro.pdf_local_url || null,
        sinistro.createdAt,
        sinistro.updatedAt,
      ]
    );

    return result.lastInsertRowId;
  }

  async atualizarSinistro(id: number, sinistro: Partial<SinistroLocal>): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(sinistro).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        if (key === 'sincronizado') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value ?? null);
        }
      }
    });

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.runAsync(
      `UPDATE sinistros SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async buscarSinistro(id: number): Promise<SinistroLocal | null> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');

    const result = await this.db.getFirstAsync<SinistroLocal>(
      'SELECT * FROM sinistros WHERE id = ?',
      [id]
    );

    if (result) {
      return { ...result, sincronizado: Boolean(result.sincronizado) };
    }
    return null;
  }

  async buscarSinistroPorServidorId(servidorId: number): Promise<SinistroLocal | null> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');

    const result = await this.db.getFirstAsync<SinistroLocal>(
      'SELECT * FROM sinistros WHERE servidor_id = ? LIMIT 1',
      [servidorId]
    );

    if (result) {
      return { ...result, sincronizado: Boolean(result.sincronizado) };
    }
    return null;
  }

  async listarSinistros(): Promise<SinistroLocal[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');

    const results = await this.db.getAllAsync<SinistroLocal>(
      'SELECT * FROM sinistros ORDER BY createdAt DESC'
    );

    return results.map(r => ({ ...r, sincronizado: Boolean(r.sincronizado) }));
  }

  async listarSinistrosNaoSincronizados(): Promise<SinistroLocal[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');

    const results = await this.db.getAllAsync<SinistroLocal>(
      'SELECT * FROM sinistros WHERE sincronizado = 0 ORDER BY createdAt ASC'
    );

    return results.map(r => ({ ...r, sincronizado: Boolean(r.sincronizado) }));
  }

  async deletarSinistro(id: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');
    await this.db.runAsync('DELETE FROM sinistros WHERE id = ?', [id]);
  }

  // ==================== FOTOS ====================

  async adicionarFoto(foto: Omit<FotoLocal, 'id'>): Promise<number> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');

    const result = await this.db.runAsync(
      `INSERT INTO fotos (
        sinistro_local_id, uri, base64, tipo, descricao, sincronizado, servidor_id, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        foto.sinistro_local_id,
        foto.uri,
        foto.base64 || null,
        foto.tipo,
        foto.descricao || null,
        foto.sincronizado ? 1 : 0,
        foto.servidor_id || null,
        foto.createdAt,
      ]
    );

    return result.lastInsertRowId;
  }

  async listarFotosSinistro(sinistroLocalId: number): Promise<FotoLocal[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');

    const results = await this.db.getAllAsync<FotoLocal>(
      'SELECT * FROM fotos WHERE sinistro_local_id = ? ORDER BY createdAt ASC',
      [sinistroLocalId]
    );

    return results.map(f => ({ ...f, sincronizado: Boolean(f.sincronizado) }));
  }

  async atualizarFoto(id: number, foto: Partial<FotoLocal>): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(foto).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        if (key === 'sincronizado') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value ?? null);
        }
      }
    });

    values.push(id);

    await this.db.runAsync(
      `UPDATE fotos SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deletarFoto(id: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');
    await this.db.runAsync('DELETE FROM fotos WHERE id = ?', [id]);
  }

  // ==================== UTILIDADES ====================

  async limparDadosSincronizados(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');
    
    // Remove fotos sincronizadas
    await this.db.runAsync('DELETE FROM fotos WHERE sincronizado = 1');
    
    // Remove sinistros finalizados e sincronizados
    await this.db.runAsync(
      "DELETE FROM sinistros WHERE sincronizado = 1 AND status = 'finalizado'"
    );
  }

  async contarSinistrosNaoSincronizados(): Promise<number> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');

    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sinistros WHERE sincronizado = 0'
    );

    return result?.count || 0;
  }

  async listarSinistrosPendentes(): Promise<SinistroLocal[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database não inicializado');

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM sinistros WHERE sincronizado = 0 ORDER BY createdAt DESC'
    );

    return results.map(s => ({
      ...s,
      sincronizado: Boolean(s.sincronizado),
    }));
  }
}

export const databaseService = new DatabaseService();
