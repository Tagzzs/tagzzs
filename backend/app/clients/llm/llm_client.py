"""
LLMClient - Language Model Client for Groq

Handles interactions with Groq LLM for text generation,
reasoning, and structured outputs.
"""

import logging
import json
from typing import Optional, List, Dict, Any
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Client for interacting with Groq LLM.

    Features:
    - Single and streaming calls
    - Structured output support
    - Temperature and parameter control
    - Error handling and retries
    """

    def __init__(
        self,
        model: str = "llama-3.1-8b-instant",
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ):
        """
        Initialize LLMClient with Groq configuration.

        Args:
            model: Groq model name (default: llama-3.1-8b-instant)
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens in response

        Raises:
            RuntimeError: If Groq API key not configured
        """
        self.model_name = model
        self.temperature = temperature
        self.max_tokens = max_tokens

        try:
            logger.info(f"Initializing Groq LLM client with model: {model}")
            self.llm = ChatGroq(
                model=model, temperature=temperature, max_tokens=max_tokens
            )
            logger.info("Groq LLM client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Groq LLM: {str(e)}")
            raise RuntimeError(f"Cannot initialize Groq LLM: {str(e)}")

    def call_llm(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> str:
        """
        Make a single LLM call with optional system prompt.

        Args:
            prompt: The user prompt/query
            system_prompt: Optional system instructions
            temperature: Optional temperature override

        Returns:
            LLM response as string

        Example:
            >>> client = LLMClient()
            >>> response = client.call_llm("What is AI?")
            >>> print(response)
        """
        try:
            messages = []

            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))

            messages.append(HumanMessage(content=prompt))

            # Use provided temperature or default
            if temperature is not None:
                llm = ChatGroq(
                    model=self.model_name,
                    temperature=temperature,
                    max_tokens=self.max_tokens,
                )
            else:
                llm = self.llm

            response = llm.invoke(messages)
            result = response.content if hasattr(response, "content") else str(response)

            logger.debug(f"LLM call successful, response length: {len(result)}")
            return result  # type: ignore

        except Exception as e:
            logger.error(f"Error calling LLM: {str(e)}")
            raise

    def call_llm_structured(
        self,
        prompt: str,
        output_format: str = "json",
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Make LLM call requesting structured output (JSON/dict).

        Args:
            prompt: The user prompt
            output_format: Expected format ('json', 'dict', etc.)
            system_prompt: Optional system instructions

        Returns:
            Parsed structured output as dictionary

        Example:
            >>> client = LLMClient()
            >>> result = client.call_llm_structured(
            ...     "List 3 benefits of AI as JSON",
            ...     output_format="json"
            ... )
            >>> print(result['benefits'])
        """
        try:
            # Add instruction for structured output
            structured_prompt = f"""{prompt}

Please respond ONLY with valid {output_format.upper()} (no markdown, no extra text).
Your response must be valid {output_format} that can be parsed."""

            response_text = self.call_llm(structured_prompt, system_prompt)

            # Try to parse as JSON
            if output_format.lower() == "json":
                # Remove markdown code blocks if present
                if response_text.startswith("```"):
                    response_text = response_text.split("```")[1]
                    if response_text.startswith("json"):
                        response_text = response_text[4:]
                    response_text = response_text.strip()

                parsed = json.loads(response_text)
                logger.debug("Successfully parsed structured output")
                return parsed
            else:
                logger.warning(
                    f"Format {output_format} not fully supported, returning as dict"
                )
                return {"raw_response": response_text}

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse structured output: {str(e)}")
            raise ValueError(f"LLM did not return valid {output_format}: {str(e)}")
        except Exception as e:
            logger.error(f"Error in structured call: {str(e)}")
            raise

    def streaming_call(self, prompt: str, system_prompt: Optional[str] = None):
        """
        Make a streaming LLM call (yields tokens as they arrive).

        Args:
            prompt: The user prompt
            system_prompt: Optional system instructions

        Yields:
            Response tokens as they are generated

        Example:
            >>> client = LLMClient()
            >>> for token in client.streaming_call("Tell a story"):
            ...     print(token, end='', flush=True)
        """
        try:
            messages = []

            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))

            messages.append(HumanMessage(content=prompt))

            # Use streaming
            for chunk in self.llm.stream(messages):
                if hasattr(chunk, "content") and chunk.content:
                    yield chunk.content

        except Exception as e:
            logger.error(f"Error in streaming call: {str(e)}")
            raise

    def batch_call(
        self, prompts: List[str], system_prompt: Optional[str] = None
    ) -> List[str]:
        """
        Make multiple LLM calls efficiently.

        Args:
            prompts: List of prompts to process
            system_prompt: Optional system instructions for all calls

        Returns:
            List of responses corresponding to each prompt
        """
        try:
            responses = []
            for prompt in prompts:
                response = self.call_llm(prompt, system_prompt)
                responses.append(response)

            logger.debug(f"Processed {len(prompts)} prompts")
            return responses

        except Exception as e:
            logger.error(f"Error in batch call: {str(e)}")
            raise

    def generate_task_prompt(
        self, task_type: str, query: str, context: Optional[str] = None
    ) -> str:
        """
        Generate task-specific prompt with context.

        Args:
            task_type: Type of task (SEARCH, SUMMARIZE, ANALYZE, etc.)
            query: The user query
            context: Optional context/retrieved information

        Returns:
            Formatted prompt for the task
        """
        prompts = {
            "SEARCH": f"""Based on the following information, answer this query concisely:

Query: {query}

Context: {context or "No context provided"}

Provide a clear, direct answer.""",
            "SUMMARIZE": f"""Summarize the following content concisely:

Content: {context or query}

Provide a 2-3 sentence summary.""",
            "ANALYZE": f"""Analyze the following content and provide insights:

Content: {context or query}

Identify: 1) Key patterns, 2) Important concepts, 3) Notable relationships""",
            "COMPARE": f"""Compare the following items or topics:

Query: {query}
Context: {context}

Highlight similarities and differences.""",
            "EXTRACT_INSIGHTS": f"""Extract key insights from this content:

Content: {context or query}

Provide: 1) Main takeaways, 2) Actionable items, 3) Future implications""",
            "METADATA_QUERY": f"""From the provided data, find items matching: {query}

Data: {context}

Return findings in structured format.""",
        }

        return prompts.get(task_type, query)

    def set_temperature(self, temperature: float) -> None:
        """
        Update LLM temperature.

        Args:
            temperature: New temperature value (0.0-1.0)
        """
        if not 0.0 <= temperature <= 1.0:
            raise ValueError("Temperature must be between 0.0 and 1.0")

        self.temperature = temperature
        self.llm = ChatGroq(
            model=self.model_name, temperature=temperature, max_tokens=self.max_tokens
        )
        logger.info(f"Temperature updated to {temperature}")
