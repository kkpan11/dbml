import _, { get } from 'lodash';
import Schema from './schema';
import Ref from './ref';
import Enum from './enum';
import TableGroup from './tableGroup';
import Table from './table';
import StickyNote from './stickyNote';
import Element from './element';
import {
  DEFAULT_SCHEMA_NAME, TABLE, TABLE_GROUP, ENUM, REF, NOTE,
} from './config';
import DbState from './dbState';

class Database extends Element {
  constructor ({
    schemas = [],
    tables = [],
    notes = [],
    enums = [],
    refs = [],
    tableGroups = [],
    project = {},
    aliases = [],
  }) {
    super();
    this.dbState = new DbState();
    this.generateId();
    this.hasDefaultSchema = false;
    this.schemas = [];
    this.notes = [];
    this.note = project.note ? get(project, 'note.value', project.note) : null;
    this.noteToken = project.note ? get(project, 'note.token', project.noteToken) : null;
    this.databaseType = project.database_type;
    this.name = project.name;
    this.token = project.token;
    this.aliases = aliases;

    this.processNotes(notes);
    // The process order is important. Do not change !
    this.processSchemas(schemas);
    this.processSchemaElements(enums, ENUM);
    this.processSchemaElements(tables, TABLE);
    this.processSchemaElements(notes, NOTE);
    this.processSchemaElements(refs, REF);
    this.processSchemaElements(tableGroups, TABLE_GROUP);
  }

  generateId () {
    this.id = this.dbState.generateId('dbId');
  }

  processNotes (rawNotes) {
    rawNotes.forEach((note) => {
      this.pushNote(new StickyNote({ ...note, database: this }));
    });
  }

  pushNote (note) {
    this.checkNote(note);
    this.notes.push(note);
  }

  checkNote (note) {
    if (this.notes.some(n => n.name === note.name)) {
      note.error(`Notes ${note.name} existed`);
    }
  }

  processSchemas (rawSchemas) {
    rawSchemas.forEach((schema) => {
      this.pushSchema(new Schema({ ...schema, database: this }));
    });
  }

  pushSchema (schema) {
    this.checkSchema(schema);
    this.schemas.push(schema);
  }

  checkSchema (schema) {
    if (this.schemas.some(s => s.name === schema.name)) {
      schema.error(`Schemas ${schema.name} existed`);
    }
  }

  processSchemaElements (elements, elementType) {
    let schema;

    elements.forEach((element) => {
      if (element.schemaName) {
        schema = this.findOrCreateSchema(element.schemaName);
        if (element.schemaName === DEFAULT_SCHEMA_NAME) {
          // this.hasDefaultSchema = true;
        }
      } else {
        schema = this.findOrCreateSchema(DEFAULT_SCHEMA_NAME);
      }

      switch (elementType) {
        case TABLE:
          schema.pushTable(new Table({ ...element, schema }));
          break;

        case ENUM:
          schema.pushEnum(new Enum({ ...element, schema }));
          break;

        case TABLE_GROUP:
          schema.pushTableGroup(new TableGroup({ ...element, schema }));
          break;

        case REF:
          schema.pushRef(new Ref({ ...element, schema }));
          break;

        default:
          break;
      }
    });
  }

  findOrCreateSchema (schemaName) {
    let schema = this.schemas.find(s => s.name === schemaName || s.alias === schemaName);
    // create new schema if schema not found
    if (!schema) {
      schema = new Schema({
        name: schemaName,
        note: {
          value: schemaName === DEFAULT_SCHEMA_NAME ? `Default ${_.capitalize(DEFAULT_SCHEMA_NAME)} Schema` : null,
        },
        database: this,
      });

      this.pushSchema(schema);
    }

    return schema;
  }

  findTableAlias (alias) {
    const sym = this.aliases.find(a => a.name === alias);
    if (!sym || sym.kind !== 'table') return null;

    const schemaName = sym.value.schemaName || DEFAULT_SCHEMA_NAME;
    const schema = this.schemas.find(s => s.name === schemaName);
    if (!schema) return null;

    const { tableName } = sym.value;
    const table = schema.tables.find(t => t.name === tableName);
    return table;
  }

  findTable (schemaName, tableName) {
    let table = null;
    if (!schemaName) {
      table = this.findTableAlias(tableName);
      if (table) return table;
    }

    const schema = this.findOrCreateSchema(schemaName || DEFAULT_SCHEMA_NAME);
    if (!schema) {
      this.error(`Schema ${schemaName || DEFAULT_SCHEMA_NAME} don't exist`);
    }
    return schema.findTable(tableName);
  }

  findEnum (schemaName, name) {
    const schema = this.schemas.find(s => s.name === schemaName || s.alias === schemaName);
    if (!schema) return null;
    const _enum = schema.enums.find(e => e.name === name);
    return _enum;
  }

  export () {
    return {
      ...this.exportChild(),
    };
  }

  shallowExport () {
    return {
      hasDefaultSchema: this.hasDefaultSchema,
      note: this.note,
      databaseType: this.databaseType,
      name: this.name,
    };
  }

  exportChild () {
    return {
      schemas: this.schemas.map(s => s.export()),
      notes: this.notes.map(n => n.export()),
    };
  }

  exportChildIds () {
    const schemaIds = new Array(this.schemas.length);
    for (let i = 0; i < this.schemas.length; i += 1) schemaIds[i] = this.schemas[i].id;

    const noteIds = new Array(this.notes.length);
    for (let i = 0; i < this.notes.length; i += 1) noteIds[i] = this.notes[i].id;

    return { schemaIds, noteIds };
  }

  normalize () {
    const normalizedModel = {
      database: {
        [this.id]: {
          id: this.id,
          ...this.shallowExport(),
          ...this.exportChildIds(),
        },
      },
      schemas: {},
      notes: {},
      refs: {},
      enums: {},
      tableGroups: {},
      tables: {},
      endpoints: {},
      enumValues: {},
      indexes: {},
      indexColumns: {},
      fields: {},
    };

    this.schemas.forEach((schema) => schema.normalize(normalizedModel));
    this.notes.forEach((note) => note.normalize(normalizedModel));
    return normalizedModel;
  }
}

export default Database;
