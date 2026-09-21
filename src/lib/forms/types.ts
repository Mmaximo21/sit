export type Field =
  | {
      type: "text";
      key: string;
      label: string;
      placeholder?: string;
      hint?: string;
      required?: boolean;
    }
  | {
      type: "textarea";
      key: string;
      label: string;
      placeholder?: string;
      hint?: string;
      rows?: number;
      required?: boolean;
    }
  | { type: "date"; key: string; label: string; required?: boolean }
  | { type: "number"; key: string; label: string; suffix?: string; required?: boolean }
  | {
      type: "select";
      key: string;
      label: string;
      options: string[];
      hint?: string;
      required?: boolean;
    }
  | {
      type: "radio";
      key: string;
      label: string;
      options: string[];
      hint?: string;
      required?: boolean;
    }
  | { type: "checkbox"; key: string; label: string }
  | { type: "sided"; key: string; label: string; sides: string[]; options: string[] }
  | { type: "computed"; key: string; label: string; sum: string[]; hint?: string }
  | { type: "note"; key: string; label: string }
  | {
      type: "attachments";
      key: string;
      label: string;
      hint?: string;
      accept?: string;
      required?: boolean;
    }
  | {
      type: "calorias";
      key: string;
      label: string;
      hint?: string;
      required?: boolean;
    }
  | {
      type: "table";
      key: string;
      label: string;
      columns: TableColumn[];
      rows?: Record<string, string>[];
      addable?: boolean;
      minRows?: number;
    };

export type TableColumn = {
  key: string;
  label: string;
  type: "text" | "select" | "checkbox" | "number";
  options?: string[];
  readOnly?: boolean;
};

export type Section = {
  title: string;
  subtitle?: string;
  description?: string;
  fields: Field[];
};

export type FormSpec = {
  specialty: string;
  title: string;
  subtitle?: string;
  sections: Section[];
};

export const SIM_NAO = ["Sim", "Não"];
