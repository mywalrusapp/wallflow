import path from 'path';
import ts from 'typescript';
import tsConfig from '../../tsconfig.json';

export abstract class TSCompiler {
  public static compile(filename: string) {
    const program = ts.createProgram([path.join(__dirname, '../WorkflowGlobal.d.ts'), filename], {
      ...(tsConfig.compilerOptions as any),
      downlevelIteration: true,
    });

    let output = '';
    const emitResult = program.emit(undefined, (file, data) => {
      output = data;
    });

    const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    const errors = [];

    for (const diagnostic of diagnostics) {
      if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        errors.push(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
      } else {
        errors.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      }
    }

    if (errors.length > 0) {
      throw new Error(`compilation error:\n  ${errors.join('\n  ')}`);
    }

    return output;
  }
}
