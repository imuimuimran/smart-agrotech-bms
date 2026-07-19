const validate = (schema) => async (req, res, next) => {
  try {
    // Parses and validates body, query, and params
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    // Assigns cleaned, validated data back to the request object
    req.body = parsed.body;
    req.query = parsed.query;
    req.params = parsed.params;
    
    return next();
  } catch (error) {
    // Sends formatting errors directly to your global error middleware
    return next(error); 
  }
};

export default validate;
