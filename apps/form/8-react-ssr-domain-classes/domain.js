class Customer {
  constructor(raw) {
    this.firstName = raw.firstName || '';
    this.lastName = raw.lastName || '';
    this.email = raw.email || '';
    this.phone = raw.phone || '';
    this.street = raw.street || '';
    this.city = raw.city || '';
    this.state = raw.state || '';
    this.zip = raw.zip || '';
    this.country = raw.country || '';
    this.accountType = raw.accountType || 'individual';
    this.companyName = raw.companyName || '';
    this.taxId = raw.taxId || '';
    this.poNumber = raw.poNumber || '';
  }

  static fromJSON(raw) { return new Customer(raw); }

  display(field) { return String(this[field]); }
}

export function toCustomer(data) {
  return data[0] ? Customer.fromJSON(data[0]) : new Customer({});
}

export { Customer };
