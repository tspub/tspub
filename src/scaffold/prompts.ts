import prompts from "prompts";

export interface InitAnswers {
  name: string;
  dualPublish: boolean;
  react: boolean;
  author: string;
  description: string;
  license: "MIT" | "Apache-2.0" | "ISC";
}

export async function promptInit(defaultName?: string): Promise<InitAnswers> {
  const answers = await prompts([
    {
      type: "text",
      name: "name",
      message: "Package name",
      initial: defaultName ?? "my-package",
    },
    {
      type: "text",
      name: "description",
      message: "Description",
      initial: "",
    },
    {
      type: "text",
      name: "author",
      message: "Author",
      initial: "",
    },
    {
      type: "select",
      name: "license",
      message: "License",
      choices: [
        { title: "MIT", value: "MIT" },
        { title: "Apache-2.0", value: "Apache-2.0" },
        { title: "ISC", value: "ISC" },
      ],
      initial: 0,
    },
    {
      type: "confirm",
      name: "dualPublish",
      message: "Include CJS output (dual publish)?",
      initial: false,
    },
    {
      type: "confirm",
      name: "react",
      message: "Add React/JSX support?",
      initial: false,
    },
  ]);

  return answers as InitAnswers;
}
