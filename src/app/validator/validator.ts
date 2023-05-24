import Ajv from 'ajv';
const ajv = new Ajv({removeAdditional: 'all', strict: false});


ajv.addFormat('email', {
    type: 'string',
    validate: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/
});

ajv.addFormat('integer', (data:string) => {
    const integerPattern = /^[0-9]+$/;
    return integerPattern.test(data);
});

ajv.addFormat('password', (data:string) => {
    const passwordPattern = /^.{6,}$/;
    return passwordPattern.test(data);
});
ajv.addFormat('datetime', (data: string) => {
    const datePattern = /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/;
    return datePattern.test(data);
});
const validate = async (schema: object, data: any) => {
    try {
        const validator = ajv.compile(schema);
        const valid = await validator(data);
        if(!valid)
            return ajv.errorsText(validator.errors);
        return true;
    } catch (err) {
        return err.message;
    }
}

export {validate};