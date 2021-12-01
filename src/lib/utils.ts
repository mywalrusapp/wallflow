export const safeToJSON = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

export const getWorkflowName = (contents: string) => {
  const [, workflowName] = contents.match(/workflow\s*\.\s*register\(["']([^)]+)["']\)/) ?? [];
  return workflowName;
};
