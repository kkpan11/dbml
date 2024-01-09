import { CompileError, CompileErrorCode } from '../../../errors';
import { isValidName, pickValidator, registerSchemaStack } from '../utils';
import { ElementValidator } from '../types';
import SymbolTable from '../../../analyzer/symbol/symbolTable';
import { SyntaxToken } from '../../../lexer/tokens';
import { BlockExpressionNode, ElementDeclarationNode, FunctionApplicationNode, ListExpressionNode, SyntaxNode } from '../../../parser/nodes';
import SymbolFactory from '../../../analyzer/symbol/factory';
import { createTableGroupFieldSymbolIndex, createTableGroupSymbolIndex, createTableSymbolIndex } from '../../../analyzer/symbol/symbolIndex';
import { destructureComplexVariable, extractVarNameFromPrimaryVariable } from '../../../analyzer/utils';
import _ from 'lodash';
import { TableGroupFieldSymbol } from '../../../analyzer/symbol/symbols';
import { isExpressionAVariableNode } from '../../../parser/utils';

export default class TableGroupValidator implements ElementValidator {
  private declarationNode: ElementDeclarationNode & { type: SyntaxToken; };
  private containerSymbolTable: SymbolTable;
  private symbolFactory: SymbolFactory;

  constructor(declarationNode: ElementDeclarationNode & { type: SyntaxToken }, containerSymbolTable: SymbolTable, symbolFactory: SymbolFactory) {
    this.declarationNode = declarationNode;
    this.containerSymbolTable = containerSymbolTable;
    this.symbolFactory = symbolFactory;
  }

  validate(): CompileError[] {
    return [...this.validateContext(), ...this.validateName(), ...this.validateAlias(), ...this.validateSettingList(), ...this.registerElement(), ...this.validateBody()];
  }

  validateContext(): CompileError[] {
    if (this.declarationNode.parent instanceof ElementDeclarationNode) {
      return [new CompileError(CompileErrorCode.INVALID_TABLEGROUP_CONTEXT, 'TableGroup must appear top-level', this.declarationNode)];
    }
    return [];
  }

  validateName(nameNode?: SyntaxNode): CompileError[] {
    if (!nameNode) {
      return [new CompileError(CompileErrorCode.NAME_NOT_FOUND, 'A TableGroup must have a name', this.declarationNode)]
    }
    if (!isValidName(nameNode)) {
      return [new CompileError(CompileErrorCode.INVALID_NAME, 'A TableGroup name must be of the form <tablegroup> or <schema>.<tablegroup>', nameNode)];
    };
    return [];
  }

  validateAlias(aliasNode?: SyntaxNode): CompileError[] {
    if (aliasNode) {
      return [new CompileError(CompileErrorCode.UNEXPECTED_ALIAS, 'A TableGroup should\'nt have an alias', aliasNode)];
    }

    return [];
  }

  registerElement(): CompileError[] {
    const { name } = this.declarationNode;

    const maybeNameFragments = destructureComplexVariable(name);
    if (maybeNameFragments.isOk()) {
      const nameFragments = maybeNameFragments.unwrap();
      const symbolTable = registerSchemaStack(nameFragments, this.containerSymbolTable, this.symbolFactory);
      const tableId = createTableGroupSymbolIndex(nameFragments.pop()!);
      if (symbolTable.has(tableId)) {
        return [new CompileError(CompileErrorCode.DUPLICATE_NAME, 'This TableGroup name already exists', name!)];
      }
      symbolTable.set(tableId, this.declarationNode.symbol!);
    }

    return [];
  }

  validateSettingList(settingList?: ListExpressionNode): CompileError[] {
    if (settingList) {
      return [new CompileError(CompileErrorCode.UNEXPECTED_SETTINGS, 'A TableGroup should\'nt have a setting list', settingList)]
    }

    return [];
  }

  validateBody(body?: FunctionApplicationNode | BlockExpressionNode): CompileError[] {
    if (!body) {
      return [];
    }
    if (body instanceof FunctionApplicationNode) {
      return [new CompileError(CompileErrorCode.UNEXPECTED_SIMPLE_BODY, 'A TableGroup\'s body must be a block', body)];
    }

    const [fields, subs] = _.partition(body.body, (e) => e instanceof FunctionApplicationNode);
    return [...this.validateFields(fields as FunctionApplicationNode[]), ...this.validateSubElements(subs as ElementDeclarationNode[])]
  }

  validateFields(fields: FunctionApplicationNode[]): CompileError[] {
    return fields.flatMap((field) => {
      const errors: CompileError[] = []
      if (field.callee && !isExpressionAVariableNode(field.callee)) {
        errors.push(new CompileError(CompileErrorCode.INVALID_TABLEGROUP_FIELD, 'A TableGroup field must be an identifier or a quoted identifier', field.callee));
      }

      this.registerField(field);

      const remains = field.args.slice(1);
      if (remains.length > 0) {
        errors.push(new CompileError(CompileErrorCode.INVALID_TABLEGROUP_FIELD, 'A TableGroup field should only have a single Table name', remains));
      }

      return errors;
    });
  }

  validateSubElements(subs: ElementDeclarationNode[]): CompileError[] {
    return subs.flatMap((sub) => {
      sub.parent = this.declarationNode;
      if (!sub.type) {
        return [];
      }
      const _Validator = pickValidator(sub as ElementDeclarationNode & { type: SyntaxToken });
      const validator = new _Validator(sub as ElementDeclarationNode & { type: SyntaxToken }, this.declarationNode.symbol!.symbolTable!, this.symbolFactory);
      return validator.validate();
    });
  }

  registerField(field: FunctionApplicationNode): CompileError[] {
    if (field.callee && isExpressionAVariableNode(field.callee)) {
      const tableGroupField = extractVarNameFromPrimaryVariable(field.callee).unwrap();
      const tableGroupFieldId = createTableGroupFieldSymbolIndex(tableGroupField);
      
      const tableGroupSymbol = this.symbolFactory.create(TableGroupFieldSymbol, { declaration: field })
      field.symbol = tableGroupSymbol;

      const symbolTable = this.declarationNode.symbol!.symbolTable!;
      if (symbolTable.has(tableGroupFieldId)) {
        const symbol = symbolTable.get(tableGroupFieldId);
        return [
          new CompileError(CompileErrorCode.DUPLICATE_TABLEGROUP_FIELD_NAME, `${tableGroupField} already exists in the group`, field),
          new CompileError(CompileErrorCode.DUPLICATE_TABLEGROUP_FIELD_NAME, `${tableGroupField} already exists in the group`, symbol!.declaration!),
        ]
      }
      symbolTable.set(tableGroupFieldId, tableGroupSymbol);
    }
    return [];
  }
}
