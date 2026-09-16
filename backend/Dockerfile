FROM python:3.12.3-slim-bookworm

ENV POETRY_VERSION=1.8.0

# Install Poetry
RUN pip install "poetry==$POETRY_VERSION"

# Set work directory
WORKDIR /app

# Copy dependency files
COPY poetry.lock pyproject.toml /app/

# Disable virtual environment
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install --no-interaction --no-ansi

# Install Chromium and Playwright dependencies
RUN playwright install --with-deps chromium

# Copy backend source files
COPY ./ /app/

# Start FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
