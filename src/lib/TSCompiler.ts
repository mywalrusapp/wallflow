import path from 'path';
import ts from 'typescript';

export abstract class TSCompiler {
  public static compile(filename: string, options: ts.CompilerOptions) {
    const program = ts.createProgram([filename], options);

    const expectedFiles = `${filename.substr(0, filename.length - 3)}.js`;

    let output = '';
    const emitResult = program.emit(undefined, (file, data) => {
      if (file === expectedFiles) {
        output = data;
      }
    });

    const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    const errors = [];

    for (const diagnostic of diagnostics) {
      if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        errors.push(`${path.basename(diagnostic.file.fileName)} (${line + 1},${character + 1}): ${message}`);
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
