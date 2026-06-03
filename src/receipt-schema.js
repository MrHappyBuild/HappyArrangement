export const receiptJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "merchantName",
    "merchantCategory",
    "receiptDate",
    "receiptTime",
    "currency",
    "subtotal",
    "taxTotal",
    "grandTotal",
    "notes",
    "tableRows",
    "items"
  ],
  properties: {
    merchantName: {
      anyOf: [{ type: "string" }, { type: "null" }]
    },
    merchantCategory: {
      type: "string",
      enum: ["store", "restaurant", "unknown"]
    },
    receiptDate: {
      anyOf: [{ type: "string" }, { type: "null" }]
    },
    receiptTime: {
      anyOf: [{ type: "string" }, { type: "null" }]
    },
    currency: {
      anyOf: [{ type: "string" }, { type: "null" }]
    },
    subtotal: {
      anyOf: [{ type: "number" }, { type: "null" }]
    },
    taxTotal: {
      anyOf: [{ type: "number" }, { type: "null" }]
    },
    grandTotal: {
      anyOf: [{ type: "number" }, { type: "null" }]
    },
    notes: {
      type: "array",
      items: {
        type: "string"
      }
    },
    tableRows: {
      type: "array",
      items: {
        type: "string"
      }
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "quantity", "unitPrice", "lineTotal", "rawLine"],
        properties: {
          name: {
            type: "string"
          },
          quantity: {
            anyOf: [{ type: "number" }, { type: "null" }]
          },
          unitPrice: {
            anyOf: [{ type: "number" }, { type: "null" }]
          },
          lineTotal: {
            anyOf: [{ type: "number" }, { type: "null" }]
          },
          rawLine: {
            anyOf: [{ type: "string" }, { type: "null" }]
          }
        }
      }
    }
  }
};

export const receiptSummaryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "merchantName",
    "merchantCategory",
    "receiptDate",
    "receiptTime",
    "currency",
    "subtotal",
    "taxTotal",
    "grandTotal",
    "notes"
  ],
  properties: {
    merchantName: {
      anyOf: [{ type: "string" }, { type: "null" }]
    },
    merchantCategory: {
      type: "string",
      enum: ["store", "restaurant", "unknown"]
    },
    receiptDate: {
      anyOf: [{ type: "string" }, { type: "null" }]
    },
    receiptTime: {
      anyOf: [{ type: "string" }, { type: "null" }]
    },
    currency: {
      anyOf: [{ type: "string" }, { type: "null" }]
    },
    subtotal: {
      anyOf: [{ type: "number" }, { type: "null" }]
    },
    taxTotal: {
      anyOf: [{ type: "number" }, { type: "null" }]
    },
    grandTotal: {
      anyOf: [{ type: "number" }, { type: "null" }]
    },
    notes: {
      type: "array",
      items: {
        type: "string"
      }
    }
  }
};

export const receiptItemsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["notes", "tableRows", "items"],
  properties: {
    notes: {
      type: "array",
      items: {
        type: "string"
      }
    },
    tableRows: {
      type: "array",
      items: {
        type: "string"
      }
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "quantity", "unitPrice", "lineTotal", "rawLine"],
        properties: {
          name: {
            type: "string"
          },
          quantity: {
            anyOf: [{ type: "number" }, { type: "null" }]
          },
          unitPrice: {
            anyOf: [{ type: "number" }, { type: "null" }]
          },
          lineTotal: {
            anyOf: [{ type: "number" }, { type: "null" }]
          },
          rawLine: {
            anyOf: [{ type: "string" }, { type: "null" }]
          }
        }
      }
    }
  }
};
