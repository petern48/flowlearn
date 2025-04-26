
To run the backend server:
```
uv run <python_file>
```

For example,
```
uv run backend-2.py
```

You can send a test POST request to the endpoint you want to test by running the following in the terminal:

```
curl -X POST http://localhost:5000/api/generate_graph   -H "Content-Type: application/json"   -d '{"topic": "Example topic"}'
```