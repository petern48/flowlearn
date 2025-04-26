
To run the backend server:
```
uv run <python_file>
```

For example,
```
uv run backend-2.py
```

TODO: The gemini api call is not working properly, when you send a post request, it returns an error rather than a proper response. Once this is fixed, we need to have the frontend query the backend to get this data.

`backend-1.py` has the old backend that worked with `frontend/src/d3_App.tsx`. We don't want that version, but that's how the api would be called. The gemini call was still broken for it, as it is for backend-2.py. `backend-2.py` is what claude generated to work with React Flow in `App.tsx` (what we want to use). Still broken, but it might be better to work from there.

You can send a test POST request to the endpoint you want to test by running the following in the terminal:

```
curl -X POST http://localhost:5000/api/generate_graph   -H "Content-Type: application/json"   -d '{"topic": "Example topic"}'
```