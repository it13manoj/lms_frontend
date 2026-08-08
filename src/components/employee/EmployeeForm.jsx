// Add this helper function
const getEmployeeIdFormat = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    return `PT${dateStr}[UserID]`;
};

// Add this in the form
<Form.Group className="mb-3">
    <Form.Label>Employee ID</Form.Label>
    <Form.Control
        type="text"
        value="Auto-generated"
        disabled
        className="bg-light"
    />
    <Form.Text className="text-muted">
        Format: <code>{getEmployeeIdFormat()}</code>
        <br />
        Generated automatically when employee is created
    </Form.Text>
</Form.Group>