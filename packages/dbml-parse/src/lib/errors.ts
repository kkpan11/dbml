import _ from 'lodash';
import { SyntaxToken } from './lexer/tokens';
import { SyntaxNode } from './parser/nodes';

export enum CompileErrorCode {
  UNKNOWN_SYMBOL = 1000,

  UNEXPECTED_SYMBOL,
  UNEXPECTED_EOF,
  UNEXPECTED_NEWLINE,

  UNKNOWN_TOKEN,
  UNEXPECTED_TOKEN,
  MISPLACED_LIST_NODE,
  MISSING_SPACES,
  UNKNOWN_PREFIX_OP,
  INVALID_OPERAND,
  EMPTY_ATTRIBUTE_NAME,

  INVALID_NAME = 3000,
  UNEXPECTED_NAME,
  NAME_NOT_FOUND,
  DUPLICATE_NAME,
  INVALID_ALIAS,
  UNEXPECTED_ALIAS,
  UNEXPECTED_SETTINGS,
  INVALID_SETTINGS,
  UNEXPECTED_SIMPLE_BODY,
  UNEXPECTED_COMPLEX_BODY,

  INVALID_TABLE_CONTEXT,
  INVALID_TABLE_SETTING,
  DUPLICATE_TABLE_SETTING,

  INVALID_TABLEGROUP_CONTEXT,
  INVALID_TABLEGROUP_ELEMENT_NAME,
  DUPLICATE_TABLEGROUP_ELEMENT_NAME,
  DUPLICATE_TABLEGROUP_FIELD_NAME,
  INVALID_TABLEGROUP_FIELD,

  EMPTY_TABLE,
  INVALID_COLUMN,
  INVALID_COLUMN_NAME,
  UNKNOWN_COLUMN_SETTING,
  INVALID_COLUMN_TYPE,
  DUPLICATE_COLUMN_NAME,
  DUPLICATE_COLUMN_SETTING,
  INVALID_COLUMN_SETTING_VALUE,

  INVALID_ENUM_CONTEXT,
  INVALID_ENUM_ELEMENT_NAME,
  INVALID_ENUM_ELEMENT,
  DUPLICATE_ENUM_ELEMENT_NAME,
  UNKNOWN_ENUM_ELEMENT_SETTING,
  DUPLICATE_ENUM_ELEMENT_SETTING,
  INVALID_ENUM_ELEMENT_SETTING,
  EMPTY_ENUM,

  INVALID_REF_CONTEXT,
  UNKNOWN_REF_SETTING,
  DUPLICATE_REF_SETTING,
  INVALID_REF_SETTING_VALUE,
  INVALID_REF_RELATIONSHIP,
  INVALID_REF_FIELD,
  EMPTY_REF,

  INVALID_NOTE_CONTEXT,
  INVALID_NOTE,
  NOTE_REDEFINED,
  NOTE_CONTENT_REDEFINED,
  EMPTY_NOTE,

  INVALID_INDEXES_CONTEXT,
  INVALID_INDEXES_FIELD,
  INVALID_INDEX,
  UNKNOWN_INDEX_SETTING,
  DUPLICATE_INDEX_SETTING,
  UNEXPECTED_INDEX_SETTING_VALUE,
  INVALID_INDEX_SETTING_VALUE,

  INVALID_PROJECT_CONTEXT,
  PROJECT_REDEFINED,
  INVALID_PROJECT_FIELD,

  INVALID_CUSTOM_CONTEXT,
  INVALID_CUSTOM_ELEMENT_VALUE,

  INVALID_ELEMENT_IN_SIMPLE_BODY,

  BINDING_ERROR = 4000,

  UNSUPPORTED = 5000,
  CIRCULAR_REF,
  SAME_ENDPOINT,
  UNEQUAL_FIELDS_BINARY_REF,
  CONFLICTING_SETTING,
}

export class CompileError extends Error {
  code: Readonly<CompileErrorCode>;

  diagnostic: Readonly<string>;

  subject: Readonly<SyntaxNode | SyntaxToken | readonly (SyntaxNode | SyntaxToken)[]>; // The nodes or tokens that cause the error

  start: Readonly<number>;

  end: Readonly<number>;

  constructor(code: number, message: string, subject: SyntaxNode | SyntaxToken | (SyntaxNode | SyntaxToken)[]) {
    if (Array.isArray(subject) && subject.length === 0) {
      throw new Error('An array subject must have non-zero length');
    } 
    super(message);
    this.code = code;
    this.diagnostic = message;
    this.subject = subject;
    this.start = Array.isArray(subject) ? subject[0].start : subject.start;
    this.end = Array.isArray(subject) ? _.last(subject)!.end : subject.end;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, CompileError.prototype);
  }
}
