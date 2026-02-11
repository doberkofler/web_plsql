# Type Assertion Operator
The `as` operator forces TypeScript to treat a value as a different type.
Why Avoid:
Removes type safety - compiler trusts you blindly, no runtime checks.
Masks design flaws - usually indicates:
- Improper types upstream
- Missing type guards
- Poor API contracts
