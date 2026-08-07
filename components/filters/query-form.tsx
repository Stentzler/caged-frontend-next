"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getDatasetCatalogAction } from "@/actions/get-dataset-catalog";
import { queryCaged } from "@/actions/query-caged";
import { QueryResults } from "@/components/charts/query-results";
import {
  hasValidCatalogDateRange,
  type DatasetCatalog,
} from "@/domain/caged/dataset-catalog";
import type { CagedErrorCode } from "@/domain/caged/errors";
import type { CagedQueryResult } from "@/domain/caged/schemas";
import { Link } from "@/i18n/navigation";
import { loadLastQuery, saveLastQuery } from "./last-query-storage";
import { SearchableSelect } from "./searchable-select";

type LocationMode = "COUNTRY" | "STATE" | "CITY";

type OccupationalFamily = {
  familyCode: string;
  familyTitle: string;
};

type City = {
  cityCode: string;
  cityName: string;
};

type State = {
  cities: readonly City[];
  stateCode: string;
  stateName: string;
};

type QueryFormProps = {
  initialCatalog?: DatasetCatalog;
  occupationalFamilies: readonly OccupationalFamily[];
  states: readonly State[];
};

type FormError =
  | "invalidCity"
  | "invalidDateRange"
  | "invalidProfession"
  | "invalidState";

function getActionErrorMessage(
  error: CagedErrorCode,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (error) {
    case "invalid_input":
      return t("errorInvalidInput");
    case "invalid_query":
      return t("errorInvalidQuery");
    case "rate_limited":
      return t("errorRateLimited");
    case "unavailable":
      return t("errorUnavailable");
    case "upstream_contract_error":
    case "upstream_error":
    case "configuration_error":
      return t("errorUnexpected");
  }
}

export function QueryForm({ initialCatalog, occupationalFamilies, states }: QueryFormProps) {
  const locale = useLocale();
  const t = useTranslations("QueryForm");
  const [isPending, startTransition] = useTransition();
  const [locationMode, setLocationMode] = useState<LocationMode>("COUNTRY");
  const [stateInput, setStateInput] = useState("");
  const [stateCode, setStateCode] = useState<string>();
  const [cityInput, setCityInput] = useState("");
  const [professionInput, setProfessionInput] = useState("");
  const [catalog, setCatalog] = useState(initialCatalog);
  const [from, setFrom] = useState(initialCatalog?.latestAvailableMonth ?? "");
  const [to, setTo] = useState(initialCatalog?.latestAvailableMonth ?? "");
  const [formError, setFormError] = useState<FormError>();
  const [hasStateBeenBlurred, setHasStateBeenBlurred] = useState(false);
  const [hasCityBeenBlurred, setHasCityBeenBlurred] = useState(false);
  const [hasProfessionBeenBlurred, setHasProfessionBeenBlurred] = useState(false);
  const [queryData, setQueryData] = useState<CagedQueryResult>();
  const [queryError, setQueryError] = useState<CagedErrorCode>();
  const [isCatalogPending, startCatalogTransition] = useTransition();
  const hasRestoredQuery = useRef(false);

  useEffect(() => {
    if (catalog === undefined || hasRestoredQuery.current) {
      return;
    }

    const restoreFrame = window.requestAnimationFrame(() => {
      const lastQuery = loadLastQuery();

      if (lastQuery === undefined) {
        return;
      }

      const savedFrom = lastQuery.from || lastQuery.result.query.from;
      const savedTo = lastQuery.to || lastQuery.result.query.to;

      if (!hasValidCatalogDateRange(savedFrom, savedTo, catalog)) {
        return;
      }

      setLocationMode(lastQuery.locationMode);
      setStateInput(lastQuery.stateInput);
      setStateCode(lastQuery.stateCode);
      setCityInput(lastQuery.cityInput);
      setProfessionInput(lastQuery.professionInput);
      setFrom(savedFrom);
      setTo(savedTo);
      setQueryData(lastQuery.result);
    });

    hasRestoredQuery.current = true;

    return () => window.cancelAnimationFrame(restoreFrame);
  }, [catalog]);

  const stateOptions = useMemo(
    () => states.map(({ stateCode: value, stateName: label }) => ({ label, value })),
    [states],
  );
  const selectedStateByCode = states.find((state) => state.stateCode === stateCode);
  const cityOptions = useMemo(
    () =>
      selectedStateByCode?.cities.map(({ cityCode: value, cityName: label }) => ({
        label,
        value,
      })) ?? [],
    [selectedStateByCode],
  );
  const professionOptions = useMemo(
    () =>
      occupationalFamilies.map(({ familyCode: value, familyTitle: label }) => ({
        label,
        value,
      })),
    [occupationalFamilies],
  );
  const monthOptions = useMemo(
    () => [...(catalog?.availableMonths ?? [])].reverse(),
    [catalog],
  );
  const selectedStateByInput = states.find((state) => state.stateName === stateInput);
  const selectedCityByInput = selectedStateByInput?.cities.find(
    (city) => city.cityName === cityInput,
  );
  const selectedProfessionByInput = occupationalFamilies.find(
    (family) => family.familyTitle === professionInput,
  );
  const isStateInvalid =
    locationMode !== "COUNTRY" &&
    (hasStateBeenBlurred || formError === "invalidState") &&
    selectedStateByInput === undefined;
  const isCityInvalid =
    locationMode === "CITY" &&
    (hasCityBeenBlurred || formError === "invalidCity") &&
    selectedCityByInput === undefined;
  const isProfessionInvalid =
    professionInput.length > 0 &&
    (hasProfessionBeenBlurred || formError === "invalidProfession") &&
    selectedProfessionByInput === undefined;

  function resetLocationSelection() {
    setStateInput("");
    setStateCode(undefined);
    setCityInput("");
    setHasStateBeenBlurred(false);
    setHasCityBeenBlurred(false);
  }

  function changeLocationMode(mode: LocationMode) {
    setLocationMode(mode);
    resetLocationSelection();
    setFormError(undefined);
    setQueryError(undefined);
  }

  function changeState(inputValue: string) {
    setStateInput(inputValue);
    setStateCode(undefined);
    setCityInput("");
    setHasCityBeenBlurred(false);
    if (formError === "invalidState" || formError === "invalidCity") {
      setFormError(undefined);
    }
  }

  function changeCity(inputValue: string) {
    setCityInput(inputValue);
    if (formError === "invalidCity") {
      setFormError(undefined);
    }
  }

  function changeProfession(inputValue: string) {
    setProfessionInput(inputValue);
    if (formError === "invalidProfession") {
      setFormError(undefined);
    }
  }

  function retryCatalog() {
    startCatalogTransition(async () => {
      const result = await getDatasetCatalogAction();

      if (!result.ok) {
        return;
      }

      setCatalog(result.data);
      setFrom(result.data.latestAvailableMonth);
      setTo(result.data.latestAvailableMonth);
      setFormError(undefined);
      setQueryError(undefined);
    });
  }

  function submitQuery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    setQueryError(undefined);

    if (catalog === undefined) {
      return;
    }

    if (locationMode !== "COUNTRY" && selectedStateByInput === undefined) {
      setHasStateBeenBlurred(true);
      setFormError("invalidState");
      return;
    }

    if (locationMode === "CITY" && selectedCityByInput === undefined) {
      setHasCityBeenBlurred(true);
      setFormError("invalidCity");
      return;
    }

    if (professionInput.length > 0 && selectedProfessionByInput === undefined) {
      setHasProfessionBeenBlurred(true);
      setFormError("invalidProfession");
      return;
    }

    if (!hasValidCatalogDateRange(from, to, catalog)) {
      setFormError("invalidDateRange");
      return;
    }

    if (locale !== "pt-BR" && locale !== "en") {
      return;
    }

    const input = {
      locale,
      locationType: locationMode,
      ...(locationMode === "STATE"
        ? { locationCode: selectedStateByInput?.stateCode }
        : {}),
      ...(locationMode === "CITY"
        ? { locationCode: selectedCityByInput?.cityCode }
        : {}),
      ...(selectedProfessionByInput === undefined
        ? {}
        : { professionCode: selectedProfessionByInput.familyCode }),
      from,
      to,
    };

    startTransition(async () => {
      const result = await queryCaged(input);

      if (!result.ok) {
        setQueryError(result.error);
        return;
      }

      setQueryData(result.data);
      saveLastQuery({
        cityCode: selectedCityByInput?.cityCode,
        cityInput,
        from,
        locationMode,
        professionCode: selectedProfessionByInput?.familyCode,
        professionInput,
        result: result.data,
        stateCode: selectedStateByInput?.stateCode,
        stateInput,
        to,
        version: 1,
      });
    });
  }

  const queryErrorMessage =
    queryError === undefined ? undefined : getActionErrorMessage(queryError, t);

  return (
    <form className="mt-10 space-y-8" onSubmit={submitQuery}>
      <fieldset>
        <legend className="text-base font-bold text-[var(--foreground)]">{t("locationLegend")}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(["COUNTRY", "STATE", "CITY"] as const).map((mode) => (
            <label
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-semibold text-[var(--foreground)]"
              key={mode}
            >
              <input
                checked={locationMode === mode}
                disabled={catalog === undefined}
                name="location-mode"
                onChange={() => changeLocationMode(mode)}
                type="radio"
                value={mode}
              />
              {t(`location${mode}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {locationMode !== "COUNTRY" ? (
        <SearchableSelect
          emptyMessage={stateInput.length > 0 ? t("noMatchingStates") : t("noStates")}
          disabled={catalog === undefined}
          id="state"
          inputValue={stateInput}
          invalidMessage={t("validationinvalidState")}
          isInvalid={isStateInvalid}
          label={t("stateLabel")}
          onBlur={() => setHasStateBeenBlurred(true)}
          onInputValueChange={changeState}
          onSelectionChange={setStateCode}
          options={stateOptions}
          placeholder={t("statePlaceholder")}
        />
      ) : null}

      {locationMode === "CITY" ? (
        <SearchableSelect
          disabled={catalog === undefined || stateCode === undefined}
          emptyMessage={
            stateCode === undefined
              ? t("selectStateFirst")
              : cityInput.length > 0
                ? t("noMatchingCities")
                : t("noCities")
          }
          id="city"
          inputValue={cityInput}
          invalidMessage={t("validationinvalidCity")}
          isInvalid={isCityInvalid}
          label={t("cityLabel")}
          onBlur={() => setHasCityBeenBlurred(true)}
          onInputValueChange={changeCity}
          onSelectionChange={() => undefined}
          options={cityOptions}
          placeholder={t("cityPlaceholder")}
        />
      ) : null}

      <SearchableSelect
        emptyMessage={
          professionInput.length > 0 ? t("noMatchingProfessions") : t("noProfessions")
        }
        disabled={catalog === undefined}
        id="profession"
        inputValue={professionInput}
        invalidMessage={t("validationinvalidProfession")}
        isInvalid={isProfessionInvalid}
        label={t("professionLabel")}
        labelAction={
          <Link
            aria-label={t("professionInfoLink")}
            className="text-[var(--primary)] underline-offset-4 hover:underline"
            href="/occupations"
            title={t("professionInfoLink")}
          >
            <span aria-hidden="true">ⓘ</span>
          </Link>
        }
        onBlur={() => setHasProfessionBeenBlurred(true)}
        onInputValueChange={changeProfession}
        onSelectionChange={() => undefined}
        options={professionOptions}
        placeholder={t("professionPlaceholder")}
      />
      <p className="-mt-6 text-sm text-[var(--muted-foreground)]">{t("professionHelp")}</p>

      <fieldset>
        <legend className="text-base font-bold text-[var(--foreground)]">{t("dateLegend")}</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="from">
            {t("fromLabel")}
            <select
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-normal"
              disabled={catalog === undefined}
              id="from"
              onChange={(event) => setFrom(event.target.value)}
              value={from}
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {`${month.slice(4, 6)}/${month.slice(0, 4)}`}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="to">
            {t("toLabel")}
            <select
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-normal"
              disabled={catalog === undefined}
              id="to"
              onChange={(event) => setTo(event.target.value)}
              value={to}
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {`${month.slice(4, 6)}/${month.slice(0, 4)}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t("dateHelp")}</p>
      </fieldset>

      {formError === "invalidDateRange" ? (
        <p aria-live="polite" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t("validationinvalidDateRange", { maxDateRange: catalog?.maxDateRange ?? 0 })}
        </p>
      ) : null}
      {catalog === undefined ? (
        <div aria-live="polite" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{t("catalogUnavailable")}</p>
          <button
            className="mt-2 font-semibold underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isCatalogPending}
            onClick={retryCatalog}
            type="button"
          >
            {isCatalogPending ? t("catalogRetryPending") : t("catalogRetry")}
          </button>
        </div>
      ) : null}
      {queryErrorMessage !== undefined ? (
        <p aria-live="polite" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {queryErrorMessage}
        </p>
      ) : null}

      <div className="flex justify-center">
        <button
          className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={catalog === undefined || isCatalogPending || isPending}
          type="submit"
        >
          {isPending ? t("submitPending") : t("submit")}
        </button>
      </div>

      {queryData !== undefined ? (
        <>
          <hr className="border-0 border-t border-[var(--border)]" />
          <QueryResults result={queryData} />
        </>
      ) : null}
    </form>
  );
}
